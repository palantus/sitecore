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

      let {menu} = await import(`../mods/${mod}/ui.mjs`);
      for(let mi of menu.reverse()){
        global.menu.push(mi)
      }
    }

    global.menu.reverse()
  }
}

async function menuExists(basePath){
  return new Promise(r => fs.access(path.join(basePath, "menu.mjs"), fs.F_OK, (err) => {
    if (err) return r(false);
    return r(true)
  }))
}