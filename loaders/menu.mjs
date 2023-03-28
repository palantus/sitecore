/*
import { generateMenu, loadStaticMenuFiles } from "../services/menu.mjs"

export default async () => {
  await loadStaticMenuFiles()
  await generateMenu()
}
*/

import fs from 'fs'
import path from 'path'
import {menu as defaultMenu} from "../ui.mjs"


export default async () => {
  if(await menuExists(".")){
    global.menu = (await import("../menu.mjs")).default;
  } else {
    global.menu = defaultMenu;

    for(let {id:mod} of global.mods.reverse()){

      if(await menuExists(`./mods/${mod}`)){
        global.menu = (await import(`../mods/${mod}/menu.mjs`)).default;
        return;
      }

      if(await uiExists(`./mods/${mod}`)){
        let {menu} = await import(`../mods/${mod}/ui.mjs`);
        for(let mi of menu){
          let existingMenu = global.menu.find(m => m.title == mi.title)
          if(existingMenu){
            existingMenu.items.push(...mi.items)
          } else {
            global.menu.push(mi)
          }
        }
      }
    }

    global.menu = global.menu.sort((a, b) => a.title < b.title ? -1 : 1)
    for(let m of global.menu){
      m.items = m.items.sort((a, b) => a.title < b.title ? -1 : 1)
    }
  }
}

async function menuExists(basePath){
  return new Promise(r => fs.access(path.join(basePath, "menu.mjs"), fs.F_OK, (err) => {
    if (err) return r(false);
    return r(true)
  }))
}
async function uiExists(basePath){
  return new Promise(r => fs.access(path.join(basePath, "ui.mjs"), fs.F_OK, (err) => {
    if (err) return r(false);
    return r(true)
  }))
}
