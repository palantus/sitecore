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
const { Router, Request, Response } = express;
const route = Router();

export default async (app) => {
	const router = Router();

  for(let {id : mod} of global.mods){
    if(!!(await fs.promises.stat(`./mods/${mod}/api/pre-auth.mjs`).catch(e => false))){
      let handler = (await import(`../mods/${mod}/api/pre-auth.mjs`)).default;
      handler(router, app)
    }
  }

  auth(router);
  acl(router)
  user(router);
  notifications(router);
  jobs(router);
  federation(router)
  system(router)

  for(let {id : mod} of global.mods){
    let handler = (await import(`../mods/${mod}/api/index.mjs`)).default;
    handler(router, fields, app)
  }
  
  graphql(router);
  
	return router
}