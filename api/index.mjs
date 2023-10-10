import auth from './routes/auth.mjs';
import user from './routes/user.mjs';
import notifications from './routes/notifications.mjs';
import {default as graphql, fields} from './routes/graphql.mjs';
import jobs from './routes/jobs.mjs';
import system from './routes/system.mjs';
import fs from 'fs'
import express from "express"
import acl from "./routes/acl.mjs"
import federation from "./routes/federation.mjs"
import mod from "./routes/mod.mjs"
import menu from "./routes/menu.mjs"
import path from 'path';
const { Router, Request, Response } = express;
const route = Router();

export default async (app) => {
	const router = Router();

  for(let {id : mod} of global.mods){
    try{
      if(!!(await fs.promises.stat(`./mods/${mod}/api/pre-auth.mjs`).catch(e => false))){
        let handler = (await import(`../mods/${mod}/api/pre-auth.mjs`)).default;
        handler(router, app)
      }
    } catch(err){}
  }

  auth(router);
  
  for(let {id : mod} of global.mods){
    try{
      if(!!(await fs.promises.stat(`./mods/${mod}/api/post-auth.mjs`).catch(e => false))){
        let handler = (await import(`../mods/${mod}/api/post-auth.mjs`)).default;
        handler(router, app)
      }
    } catch(err){}
  }

  acl(router)
  user(router);
  notifications(router);
  jobs(router);
  federation(router)
  system(router)
  mod(router)
  menu(router)

  for(let {id : mod} of global.mods){
    if(!(await apiExists(`./mods/${mod}/api`))) {
      continue;
    }
    let handler = (await import(`../mods/${mod}/api/index.mjs`)).default;
    handler(router, fields, app)
  }
  
  graphql(router);
  
	return router
}

async function apiExists(basePath){
  return new Promise(r => fs.access(path.join(basePath, "index.mjs"), fs.F_OK, (err) => {
    if (err) return r(false);
    return r(true)
  }))
}