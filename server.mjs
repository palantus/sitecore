import https from 'https'
import http from 'http'
import configLoader from './config/index.mjs';
import express from 'express';
import loader from "./loaders/index.mjs"
import {createServer as createEventServer} from "./services/clientevents.mjs"
import Entity from 'entitystorage';
import 'dotenv/config'
import yargs from 'yargs';
import fs from 'fs';
import {resolve} from "path"
const cliArgs = yargs.argv;

async function startServer() {
  
  const mode = yargs.argv.mode || process.env.MODE || "combined";
  const config = configLoader(mode)
  let storagePath = resolve(cliArgs.storage || process.env.STORAGE || "storage")
  if(mode != "www"){
    await Entity.init(storagePath);
  }

  const app = express();
  try{
    await loader({ app, mode, config, storagePath});
  } catch(err){
    console.log(err)
    process.exit(-1)
  }

  let server; 
  if(process.env.HTTPS === "TRUE" || process.env.HTTPS === "YES"){
    if(!process.env.PRIVATE_KEY_FILE || !process.env.CERT_FILE || !process.env.CA_FILE) throw "Missing certificate files (PRIVATE_KEY_FILE, CERT_FILE or CA_FILE) in .env"
    const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_FILE, 'utf8');
    const certificate = fs.readFileSync(process.env.CERT_FILE, 'utf8');
    const ca = fs.readFileSync(process.env.CA_FILE, 'utf8');
    const credentials = {key: privateKey, cert: certificate, ca};
    server = https.createServer(credentials, app)
  } else {
    server = http.createServer(app)
  }
  server.listen(config.port)
  console.log(`Server listening on port: ${config.port}`);

  if(mode != "www"){
    const wsServer = createEventServer();
    server.on('upgrade', (request, socket, head) => {
      wsServer.handleUpgrade(request, socket, head, socket => {
        wsServer.emit('connection', socket, request);
      });
    });
  }
}

startServer();