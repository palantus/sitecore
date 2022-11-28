import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import Entity, {query, sanitize, uiAPI} from "entitystorage"
import LogEntry from "../../models/logentry.mjs";
import {validateAccess} from "../../services/auth.mjs"
import APIKey from "../../models/apikey.mjs";
import Setup from "../../models/setup.mjs";
import DataType from "../../models/datatype.mjs";
import LogArea from "../../models/logarea.mjs";
import Archiver from 'archiver';
import moment from "moment"
import CoreSetup from "../../models/setup.mjs"
import contentDisposition from 'content-disposition'

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
    Object.assign(Setup.lookup(), req.body)
    res.json(true)
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

  // Mods
  route.get("/mods", (req, res, next) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(query.tag("sitemod").all.map(m => ({id: m.id, enabled: m.enabled || false, hasSetup: !!m.hasSetup})))
  })
  route.patch("/mod/:id", (req, res, next) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let mod = query.tag("sitemod").prop("id", req.params.id).first
    if(!mod) throw "Unknown mod"
    if(req.body.enabled !== undefined) mod.enabled = !!req.body.enabled
    res.json({success: true})
  })

  // API keys
  const routeAPIKeys = Router();
  app.use("/system/apikeys", routeAPIKeys)

  routeAPIKeys.get('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(Entity.search("tag:apikey").map(k => { return { id: k._id, name: k.name, userId: k.related.user?.id||null, issueDate: k.issueDate, daily: k.daily||false } }))
  });

  routeAPIKeys.get('/:id/daily', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json({key: APIKey.lookup(sanitize(req.params.id))?.generateDailyToken()})
  });

  routeAPIKeys.post('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    if (!req.body.name || !req.body.key || !req.body.userId) throw "name, key and userId are mandatory"
    let user = Entity.find(`tag:user prop:"id=${sanitize(req.body.userId)}"`)
    if (!user) throw `User ${req.body.userId} doesn't exist`
    new APIKey(req.body.name, req.body.key, user, req.body.daily)
    res.json({ success: true })
  })

  routeAPIKeys.delete('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    APIKey.lookup(sanitize(req.params.id))?.delete();
    res.json({ success: true })
  })

  route.get('/datatypes', function (req, res, next) {
    res.json(DataType.all().map(dt => dt.toObj()));
  });

  route.get('/datatypes/:id', function (req, res, next) {
    let type = DataType.lookup(sanitize(req.params.id))
    if(!type) return res.status(401).json("Datatype doesn't exist");
    res.json(type.toObj());
  });
};