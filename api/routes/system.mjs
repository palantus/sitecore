import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import Entity from "entitystorage"
import { getTimestamp } from "../../tools/date.mjs"
import LogEntry from "../../models/logentry.mjs";
import {validateAccess} from "../../services/auth.mjs"
import APIKey from "../../models/apikey.mjs";
import { dbUIAPI } from "../../loaders/express.mjs";

export default (app) => {

  app.use("/system", route)

  route.get('/log/:area', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(LogEntry.search(`tag:logentry area.prop:"id=${req.params.area}"`).sort((a, b) => a.timestamp > b.timestamp ? -1 : 1).slice(0, 200).map(e => e.toObj()));
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
    return dbUIAPI(req, res, next);
  })

  // API keys
  const routeAPIKeys = Router();
  app.use("/system/apikeys", routeAPIKeys)

  routeAPIKeys.get('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(Entity.search("tag:apikey").map(k => { return { id: k._id, name: k.name, userId: k.related.user?.id||null, issueDate: k.issueDate, daily: k.daily||false } }))
  });

  routeAPIKeys.post('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    if (!req.body.name || !req.body.key || !req.body.userId) throw "name, key and userId are mandatory"
    let user = Entity.find("tag:user prop:id=" + req.body.userId)
    if (!user) throw `User ${req.body.userId} doesn't exist`
    new APIKey(req.body.name, req.body.key, user, req.body.daily)
    res.json({ success: true })
  })

  routeAPIKeys.delete('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    APIKey.lookup(req.params.id)?.delete();
    res.json({ success: true })
  })

};