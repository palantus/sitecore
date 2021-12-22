import fs from 'fs'

export default async () => {
  global.mods = await new Promise(r => fs.readdir('mods', (err, files) => {if(err) return r([]); r(files.filter(f => process.env.LOAD_SAMPLE === "TRUE" || f != "sample"))}))

  global.modRoutes = "let routes = [];\n"
  for(let mod of global.mods){
    let content = await new Promise(r => fs.readFile(`mods/${mod}/routes.mjs`, 'utf8', (err, data) => r(err ? "" : data)))
    global.modRoutes += `${content}\n\n`
  }
  global.modRoutes += "export default routes;"
}