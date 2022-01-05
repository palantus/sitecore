import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import Entity from "entitystorage"
import { getTimestamp } from "../../tools/date.mjs"
import LogEntry from "../../models/logentry.mjs";
import {validateAccess} from "../../services/auth.mjs"

export default (app) => {

  app.use("/system", route)

  route.get('/log/:area', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    res.json(LogEntry.search(`tag:logentry area.prop:"id=${req.params.area}"`).sort((a, b) => a.timestamp > b.timestamp ? -1 : 1).slice(0, 200).map(e => e.toObj()));
  });

  route.get('/log', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    res.json(Entity.search("tag:logentry").sort((a, b) => a.timestamp > b.timestamp ? -1 : 1).slice(0, 200).map(e => ({ timestamp: e.timestamp, text: e.text })));
  });

  route.get('/logareas', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    res.json(Entity.search("tag:logarea").map(e => ({ id: e.id })));
  });

  // API keys
  const routeAPIKeys = Router();
  app.use("/system/apikeys", routeAPIKeys)

  routeAPIKeys.get('/', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    res.json(Entity.search("tag:apikey").map(k => { return { id: k._id, name: k.name, user: k.user, issueDate: k.issueDate } }))
  });

  routeAPIKeys.post('/', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    if (!req.body.name || !req.body.key || !req.body.user)
      throw "name, key and user are mandatory"
    if (!Entity.find("tag:user prop:id=" + req.body.user))
      throw `User ${req.body.user} doesn't exist`
    new Entity().tag("apikey").prop("name", req.body.name).prop("issueDate", getTimestamp()).prop("user", req.body.user).prop("key", req.body.key)
    res.json({ success: true })
  })

  routeAPIKeys.delete('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    Entity.find(`tag:apikey id:${req.params.id}`).delete();
    res.json({ success: true })
  })
};