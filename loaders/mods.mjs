import fs from 'fs'
import glob from 'glob-promise';
import Entity, { query } from "entitystorage"
import Mod from '../models/mod.mjs';

export default async ({mode}) => {
  let mods = (await new Promise(r => fs.readdir('mods', (err, files) => {if(err) return r([]); r(files)})))

  if(mode == "www"){
    global.mods = mods.map(id => ({id}));
    return;
  }

  global.mods = []
  global.modRoutes = "let routes = [];\n"
  for(let id of mods){
    let mod = Mod.lookupOrCreate(id)
    if(mod.enabled === false) continue;
    let content = await new Promise(r => fs.readFile(`mods/${id}/routes.mjs`, 'utf8', (err, data) => r(err ? "" : data)))
    global.modRoutes += `${content}\n\n`
    mod.hasSetup = new RegExp(`path\:[\ ]*\"\/${id}\/setup\"`).test(content)
    global.mods.push({
      id,
      files: (await glob(`mods/${id}/www/**/*.*`)).map(f => f.substring(`mods/${id}/www`.length)),
      hasSetup: mod.hasSetup
    })
  }
  Mod.all().filter(m => !mods.includes(m.id)).forEach(m => m.delete())
  global.modRoutes += "export default routes;"
}