import fs from 'fs'
import glob from 'glob-promise';
import Entity from "entitystorage"

export default async () => {
  let mods = (await new Promise(r => fs.readdir('mods', (err, files) => {if(err) return r([]); r(files.filter(f => process.env.LOAD_SAMPLE === "TRUE" || f != "sample"))})))

  global.mods = []
  global.modRoutes = "let routes = [];\n"
  for(let id of mods){
    let mod = Entity.find(`tag:sitemod prop:id=${id}`) || new Entity().tag("sitemod").prop("id", id).prop("enabled", true)
    if(mod.enabled === false) continue;
    let content = await new Promise(r => fs.readFile(`mods/${id}/routes.mjs`, 'utf8', (err, data) => r(err ? "" : data)))
    global.modRoutes += `${content}\n\n`
    global.mods.push({
      id,
      files: (await glob(`mods/${id}/www/**/*.*`)).map(f => f.substring(`mods/${id}/www`.length))
    })
  }
  Entity.search("tag:sitemod").filter(m => !mods.includes(m.id)).forEach(m => m.delete())
  global.modRoutes += "export default routes;"
}