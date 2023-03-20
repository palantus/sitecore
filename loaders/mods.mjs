import fs from 'fs'
import glob from 'glob-promise';
import Entity, { query } from "entitystorage"
import Mod from '../models/mod.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export default async ({mode}) => {
  let mods = (await new Promise(r => fs.readdir('mods', (err, files) => {if(err) return r([]); r(files)})))

  if(mode == "www"){
    global.mods = mods.map(id => ({id}));
    return;
  }

  global.mods = []
  global.modRoutes = "let routes = [];\n"
  modloop: for(let id of mods){
    let mod = Mod.lookupOrCreate(id)
    if(mod.enabled === false) continue;
    let packageJson
    try{
      packageJson = require(`../mods/${id}/package.json`)
      for(let dep of packageJson.sitecore?.dependencies||[]){
        if(!mods.includes(dep) || Mod.lookup(dep)?.enabled === false){
          console.log(`Enabled mod "${id}" depends on mod "${dep}", which is not enabled/installed. "${id}" will not be loaded.`)
          continue modloop; // Dependency not loaded. Skip.
        }
      }
      } catch(err){}
    let content = await new Promise(r => fs.readFile(`mods/${id}/routes.mjs`, 'utf8', (err, data) => r(err ? "" : data)))
    global.modRoutes += `${content}\n\n`
    mod.hasSetup = new RegExp(`path\:[\ ]*\"\/${id}\/setup\"`).test(content)
    global.mods.push({
      id,
      files: (await glob(`mods/${id}/www/**/*.*`)).map(f => f.substring(`mods/${id}/www`.length)),
      hasSetup: mod.hasSetup
    })
  }
  Mod.all().forEach(m => {
    m.installed = mods.includes(m.id)
  })
  global.modRoutes += "export default routes;"
}