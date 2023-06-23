import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import {query, uiAPI} from "entitystorage"
import LogEntry from "../../models/logentry.mjs";
import {permission, validateAccess} from "../../services/auth.mjs"
import APIKey from "../../models/apikey.mjs";
import Setup from "../../models/setup.mjs";
import DataType from "../../models/datatype.mjs";
import User from "../../models/user.mjs";
import LogArea from "../../models/logarea.mjs";
import Archiver from 'archiver';
import moment from "moment"
import CoreSetup from "../../models/setup.mjs"
import contentDisposition from 'content-disposition'
import Role from "../../models/role.mjs";
import { getTimestamp } from "../../tools/date.mjs";

export default (app) => {

  app.use("/system", route)

  route.get('/log/:area', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let area = LogArea.lookup(req.params.area)
    if(!area) return res.json([]);
    res.json(area.entries
                 .filter(a => !!a.timestamp)
                 .sort((a, b) => a.timestamp > b.timestamp ? -1 : 1)
                 .slice(0, 500).map(e => e.toObj()))
  });

  route.get('/log', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(LogEntry.all().filter(a => !!a.timestamp).sort((a, b) => a.timestamp > b.timestamp ? -1 : 1).slice(0, 500).map(e => ({ timestamp: e.timestamp, text: e.text })));
  });

  route.get('/logareas', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(LogArea.all().map(e => ({ id: e.id })));
  });

  route.get("/db/query", (req, res, next) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    req.params.query = req.query.q;
    return uiAPI(req, res, next);
  })

  route.get("/setup", (req, res, next) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(Setup.lookup().toObj())
  })

  route.patch("/setup", (req, res, next) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    Setup.lookup().patch(req.body);
    res.json(true);
  })

  route.post("/database/download/data", (req, res, next) => {
    if(!validateAccess(req, res, {permission: "system.database.download"})) return;
    let zip;
    if(req.body.encrypt === true){
      zip = Archiver.create('zip-encrypted', {zlib: {level: 8}, encryptionMethod: 'aes256', password: req.body.password || global.sitecore.accessTokenSecret});
    } else {
      zip = Archiver('zip');
    }
    zip.glob("*.data", {cwd: global.sitecore.storagePath})
    if(req.body.includeDotEnv) {
      zip.file(".env")
      zip.append(JSON.stringify(global.sitecore, null, 2), {name: "setup.txt"})
    }
    zip.append(JSON.stringify(global.mods.map(m => m.id), null, 2), {name: "mods.txt"})
    let filename = `${CoreSetup.lookup().siteTitle?.toLowerCase().replace(/[^a-z0-9_-]/g, '')||"sc"}_database_data_${moment().format("YYYY-MM-DD HH:mm:ss")}.zip`
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-disposition': contentDisposition(filename)
    });
    zip.pipe(res)
    zip.finalize()
  })
  
  route.get("/database/download/data", (req, res, next) => {
    if(!validateAccess(req, res, {permission: "system.database.download"})) return;
    let zip;
    zip = Archiver('zip');
    zip.glob("*.data", {cwd: global.sitecore.storagePath})
    zip.append(JSON.stringify(global.mods.map(m => m.id), null, 2), {name: "mods.txt"})
    let filename = `${CoreSetup.lookup().siteTitle?.toLowerCase().replace(/[^a-z0-9_-]/g, '')||"sc"}_database_data_${moment().format("YYYY-MM-DD HH:mm:ss")}.zip`
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-disposition': contentDisposition(filename)
    });
    zip.pipe(res)
    zip.finalize()
  })

  route.post("/database/download/full", (req, res, next) => {
    if(!validateAccess(req, res, {permission: "system.database.download"})) return;
    let zip;
    if(req.body.encrypt === true){
      zip = Archiver.create('zip-encrypted', {zlib: {level: 8}, encryptionMethod: 'aes256', password: req.body.password || global.sitecore.accessTokenSecret});
    } else {
      zip = Archiver('zip');
    }
    zip.directory(global.sitecore.storagePath, false)
    if(req.body.includeDotEnv) {
      zip.file(".env")
      zip.append(JSON.stringify(global.sitecore, null, 2), {name: "setup.txt"})
    }
    zip.append(JSON.stringify(global.mods.map(m => m.id), null, 2), {name: "mods.txt"})
    let filename = `${CoreSetup.lookup().siteTitle?.toLowerCase().replace(/[^a-z0-9_-]/g, '')||"sc"}_database_full_${moment().format("YYYY-MM-DD HH:mm:ss")}.zip`
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-disposition': contentDisposition(filename)
    });
    zip.pipe(res)
    zip.finalize()
  })

  route.get("/database/download/full", (req, res, next) => {
    if(!validateAccess(req, res, {permission: "system.database.download"})) return;
    let zip = Archiver('zip');
    zip.directory(global.sitecore.storagePath, false)
    zip.append(JSON.stringify(global.mods.map(m => m.id), null, 2), {name: "mods.txt"})
    let filename = `${CoreSetup.lookup().siteTitle?.toLowerCase().replace(/[^a-z0-9_-]/g, '')||"sc"}_database_full_${moment().format("YYYY-MM-DD HH:mm:ss")}.zip`
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-disposition': contentDisposition(filename)
    });
    zip.pipe(res)
    zip.finalize()
  })

  route.post("/restart", permission("admin"), (req, res) => {
    res.json({success: true})
    setTimeout(() => process.exit(1), 500)
  })

  route.post("/update-check", permission("admin"), (req, res) => {
    Setup.lookup().checkForUpdates().then(updateAvailable => res.json({success: true, updateAvailable}))
  })

  route.post("/update", permission("admin"), (req, res) => {
    Setup.lookup().update().then(() => res.json({success: true}))
  })

  // API keys
  const routeAPIKeys = Router();
  app.use("/system/apikeys", routeAPIKeys)

  routeAPIKeys.get('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(APIKey.all().map(k => k.toObj()))
  });

  routeAPIKeys.get('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let key = APIKey.lookup(req.params.id)
    if(!key) return res.sendStatus(404);
    res.json(key.toObj())
  });

  routeAPIKeys.patch('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let key = APIKey.lookup(req.params.id)
    if(!key) return res.sendStatus(404);
    if(typeof req.body.name === "string" && req.body.name) key.name = req.body.name;
    if(typeof req.body.federation === "boolean") key.federation = req.body.federation;
    if(typeof req.body.identifier === "string" || req.body.identifier === null) key.identifier = req.body.identifier||null;
    res.json(key.toObj())
  });

  routeAPIKeys.patch('/:id/role/:role', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let key = APIKey.lookup(req.params.id)
    if(!key) return res.sendStatus(404);
    let role = Role.lookup(req.params.role)
    if(!role) return res.sendStatus(404);
    if(req.body.enabled) key.rel(role, "role");
    else key.removeRel(role, "role")
    res.json(key.toObj())
  });

  routeAPIKeys.get('/:id/daily', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json({key: APIKey.lookup(req.params.id)?.generateDailyToken()})
  });

  routeAPIKeys.post('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    if (!req.body.name || !req.body.key || !req.body.userId) throw "name, key and userId are mandatory"
    let user = User.lookup(req.body.userId)
    if (!user) throw `User ${req.body.userId} doesn't exist`
    new APIKey(req.body.name, req.body.key, user, req.body.daily)
    res.json({ success: true })
  })

  routeAPIKeys.delete('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    APIKey.lookup(req.params.id)?.delete();
    res.json({ success: true })
  })

  route.get('/datatypes', function (req, res, next) {
    res.json(DataType.all().map(dt => dt.toObj()));
  });

  route.get('/ip', function (req, res, next) {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress 
    res.json({ip})
  });

  route.get('/debug', function (req, res, next) {
    res.json({
      timestamp: getTimestamp()
    })
  });

  route.get('/datatypes/:id', function (req, res, next) {
    let type = DataType.lookup(req.params.id)
    if(!type) return res.status(401).json("Datatype doesn't exist");
    res.json(type.toObj());
  });

  route.get("/identity", (req, res) => {
    let setup = Setup.lookup()
    res.json({
      identifier: setup.identifier || null,
      api: global.sitecore.apiURL,
      site: global.sitecore.siteURL,
      secure: global.sitecore.isSecure ? true : false,
      ws: global.sitecore.wsURL,
      title: setup.siteTitle || "SiteCore",
      mods: global.mods.map(m => m.id),
      msSigninEnabled: setup.msSigninClientId && setup.msSigninSecret ? true : false,
      homePublic: setup.homePublic ? setup.homePublic : null,
      homeInternal: setup.homeInternal ? setup.homeInternal : null
    })
  })
};