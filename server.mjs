import configLoader from './config/index.mjs';
import express from 'express';
import loader from "./loaders/index.mjs"
import {createServer as createEventServer} from "./services/clientevents.mjs"
import Entity from 'entitystorage';
import 'dotenv/config'
import yargs from 'yargs';
import {resolve} from "path"
const cliArgs = yargs.argv;

async function startServer() {
  
  const mode = process.env.MODE || "combined";
  const config = configLoader(mode)
  let storagePath = resolve(cliArgs.storage || process.env.STORAGE || "storage")
  if(mode != "www"){
    await Entity.init(storagePath);
  }

  const app = express();
  try{
    await loader({ expressApp: app, mode, config, storagePath});
  } catch(err){
    console.log(err)
    process.exit(-1)
  }

  const server = app.listen(config.port, err => {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    console.log(`Server listening on port: ${config.port}`);
  });

  const wsServer = createEventServer();
  server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
      wsServer.emit('connection', socket, request);
    });
  });
}

startServer();