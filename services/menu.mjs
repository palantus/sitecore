import {menu as defaultMenu} from "../ui.mjs"
import fs from 'fs'
import path from 'path'
import Setup from "../models/setup.mjs"
import Mod from "../models/mod.mjs";
import MenuItem from "../models/menuitem.mjs";


export function generateMenu(){
  let owners = [Setup.lookup(), ...Mod.allLoaded()]
  let items = owners.map(o => MenuItem.allEnabledFromOwner(o)).flat();
  let menu = {items: []}

  for(let item of items.filter(i => !i.hide)){
    let parent = ensurePath(menu, item.path);
    parent.items.push({
      title: item.title,
      target: item.target,
      public:  item.public,
      hideWhenSignedIn: item.hideWhenSignedIn,
      role: item.role,
      permission: item.permission
    })
  }
  global.menu = sortMenu(menu).items;
}

function sortMenu(menu){
  if(menu.items === undefined) return;
  menu.items = menu.items.sort((a, b) => a.items && !b.items ? 1 : b.items && !a.items ? -1 : a.title < b.title ? -1 : 1);
  for(let m of menu.items){
    if(m.items === undefined) continue;
    sortMenu(m);
  }
  return menu;
}

function ensurePath(menu, path){
  let s = path.split("/")
  let cur = menu
  for(let p of s){
    if(!p) continue;
    if(!cur.items) console.log(menu, path, cur)
    let next = cur.items.find(i => i.title == p)
    if(!next){
      next = {
        title: p,
        items: []
      }
      cur.items.push(next)
    }
    cur = next;
  }
  return cur;
}

export async function loadStaticMenuFiles(){
  loadMenuFile(defaultMenu, Setup.lookup());
  for(let mod of Mod.installed()){
    if(!(await uiExists(`./mods/${mod.id}`))) continue;
    let {menu} = await import(`../mods/${mod.id}/ui.mjs`);
    loadMenuFile(menu, mod);
  }
}

function loadMenuFile(menu, owner){
  let items = menu[0]?.items !== undefined ? upgradeLegacyMenu(menu) : menu
  let foundIds = new Set();
  for(let mi of items){
    let id = `${mi.path}/${mi.title}`
    foundIds.add(id)
    let item = MenuItem.lookupPathSuggested(mi.title, mi.path, owner) || new MenuItem(mi.title, mi.path, mi.target, owner);
    item.suggestedTitle = mi.title;
    item.suggestedPath = mi.path;
    item.suggestedTarget = mi.target;
    item.suggestedPublic = mi.public;
    item.suggestedHideWhenSignedIn = mi.hideWhenSignedIn;
    item.suggestedRole = mi.role;
    item.suggestedPermission = mi.permission;
  }

  for(let mi of MenuItem.allFromOwner(owner)){
    if(mi.type != "auto") continue;
    let id = `${mi.suggestedPath}/${mi.title}`;
    mi.enabled = foundIds.has(id);
  }
}

function upgradeLegacyMenu(menu){
  let items = []
  for(let m of menu){
    for(let mi of m.items){
      items.push({
        public:  m.public,
        hideWhenSignedIn: m.hideWhenSignedIn,
        role: m.role,
        permission: m.permission,
        ...mi,
        target: mi.path,
        path: `/${m.title}`
      })
    }  
  }
  return items;
}

async function uiExists(basePath){
  return new Promise(r => fs.access(path.join(basePath, "ui.mjs"), fs.F_OK, (err) => {
    if (err) return r(false);
    return r(true)
  }))
}