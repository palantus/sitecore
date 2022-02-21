import auth from './routes/auth.mjs';
import user from './routes/user.mjs';
import notifications from './routes/notifications.mjs';
import {default as graphql, fields} from './routes/graphql.mjs';
import jobs from './routes/jobs.mjs';
import system from './routes/system.mjs';
import fs from 'fs'
import express from "express"
import { aclPostAuth, aclPreAuth } from "./routes/acl.mjs"
const { Router, Request, Response } = express;
const route = Router();

export default async () => {
	const app = Router();

  for(let {id : mod} of global.mods){
    if(!!(await fs.promises.stat(`./mods/${mod}/api/auth.mjs`).catch(e => false))){
      let handler = (await import(`../mods/${mod}/api/auth.mjs`)).default;
      handler(app)
    }
  }

  aclPreAuth(app)
  auth(app);
  aclPostAuth(app)
  user(app);
  notifications(app);
  jobs(app);
  system(app)

  for(let {id : mod} of global.mods){
    let handler = (await import(`../mods/${mod}/api/index.mjs`)).default;
    handler(app, fields)
  }
  
  graphql(app);
  
	return app
}