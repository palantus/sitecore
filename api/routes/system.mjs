import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import Entity, {sanitize, uiAPI} from "entitystorage"
import LogEntry from "../../models/logentry.mjs";
import {validateAccess} from "../../services/auth.mjs"
import APIKey from "../../models/apikey.mjs";
import Setup from "../../models/setup.mjs";

export default (app) => {

  app.use("/system", route)

  route.get('/log/:area', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(LogEntry.search(`tag:logentry area.prop:"id=${sanitize(req.params.area)}"`).sort((a, b) => a.timestamp > b.timestamp ? -1 : 1).slice(0, 200).map(e => e.toObj()));
  });

  route.get('/log', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(Entity.search("tag:logentry").sort((a, b) => a.timestamp > b.timestamp ? -1 : 1).slice(0, 200).map(e => ({ timestamp: e.timestamp, text: e.text })));
  });

  route.get('/logareas', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(Entity.search("tag:logarea").map(e => ({ id: e.id })));
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

  // Mods
  route.get("/mods", (req, res, next) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(Entity.search(`tag:sitemod`).map(m => ({id: m.id, enabled: m.enabled || false, hasSetup: !!m.hasSetup})))
  })
  route.patch("/mod/:id", (req, res, next) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let mod = Entity.find(`tag:sitemod prop:"id=${sanitize(req.params.id)}"`)
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

};