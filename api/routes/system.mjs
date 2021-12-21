import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import service from "../../services/system.mjs"
import Entity from "entitystorage"
import { getTimestamp } from "../../tools/date.mjs"
import System from "../../models/system.mjs"

export default (app) => {

  app.use("/system", route)

  route.post('/convert', async function (req, res, next) {
    res.json(await service.convert());
  });

  route.get('/log', function (req, res, next) {
    res.json(Entity.search("tag:logentry").sort((a, b) => a.timestamp > b.timestamp ? -1 : 1).slice(0, 200).map(e => ({ timestamp: e.timestamp, text: e.text })));
  });

  route.patch('/setup', function (req, res, next) {
    if (!res.locals.roles.includes("admin")) return res.status(403).json({ error: `You do not have access to ${req.method} ${req.path}` })

    let sys = System.lookup()
    for (let p in req.body) {
      if (typeof req.body[p] !== "object") {
        sys[p] = req.body[p]
      }
    }
    if (req.body.flags) {
      Object.assign(sys.flags, req.body.flags)
    }
    res.json(true);
  });


  // API keys
  const routeAPIKeys = Router();
  app.use("/system/apikeys", routeAPIKeys)

  routeAPIKeys.get('/', function (req, res, next) {
    res.json(Entity.search("tag:apikey").map(k => { return { id: k._id, name: k.name, user: k.user, issueDate: k.issueDate } }))
  });

  routeAPIKeys.post('/', function (req, res, next) {
    if (!req.body.name || !req.body.key || !req.body.user)
      throw "name, key and user are mandatory"
    if (!Entity.find("tag:user prop:id=" + req.body.user))
      throw `User ${req.body.user} doesn't exist`
    new Entity().tag("apikey").prop("name", req.body.name).prop("issueDate", getTimestamp()).prop("user", req.body.user).prop("key", req.body.key)
    res.json({ success: true })
  })

  routeAPIKeys.delete('/:id', function (req, res, next) {
    Entity.find(`tag:apikey id:${req.params.id}`).delete();
    res.json({ success: true })
  })
};