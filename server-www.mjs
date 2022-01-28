import configLoader from './config/index.mjs';
import express from 'express';
import loader from "./loaders/index.mjs"
import {createServer as createEventServer} from "./services/clientevents.mjs"
const mode = "www";

async function startServer() {
  const config = configLoader(mode)
  const app = express();

  try{
    await loader({ expressApp: app, mode, config });
  } catch(err){
    console.log(err)
    process.exit(-1)
  }

  app.listen(config.port, err => {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    console.log(`Server listening on port: ${config.port}`);
  });
}

startServer();