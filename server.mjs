import configLoader from './config/index.mjs';
import express from 'express';
import loader from "./loaders/index.mjs"
import {createServer as createEventServer} from "./services/clientevents.mjs"
import Entity from 'entitystorage';
import yargs from 'yargs';
const cliArgs = yargs.argv;

const mode = "combined";

async function startServer() {
  
  await Entity.init(cliArgs.db || process.env.db || "storage");
  
  const config = configLoader(mode)

  const app = express();
  loader({ expressApp: app, mode, config});

  const server = app.listen(config.port, err => {
    if (err) {
      console.log(err);
      process.exit(1);
      return;
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