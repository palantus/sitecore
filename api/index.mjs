import auth from './routes/auth.mjs';
import system from './routes/system.mjs';
import user from './routes/user.mjs';
import notifications from './routes/notifications.mjs';
import {default as graphql, fields} from './routes/graphql.mjs';
import jobs from './routes/jobs.mjs';
import search from './routes/search.mjs';

import dotenv from 'dotenv'
dotenv.config()

import express from "express"
const { Router, Request, Response } = express;
const route = Router();

export default async () => {
	const app = Router();

  auth(app);
  system(app);
  user(app);
  notifications(app);
  jobs(app);
  search(app);

  for(let {id : mod} of global.mods){
    let handler = (await import(`../mods/${mod}/api/index.mjs`)).default;
    handler(app, fields)
  }
  
  graphql(app);
  
	return app
}