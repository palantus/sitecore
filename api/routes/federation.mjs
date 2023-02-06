import express from "express"
const { Router, Request, Response } = express;
import {noGuest, validateAccess} from "../../services/auth.mjs"
import Remote from "../../models/remote.mjs"
import Role from "../../models/role.mjs";
import APIKey from "../../models/apikey.mjs";
import { query } from "entitystorage";
import User from "../../models/user.mjs";

export default (app) => {

  const route = Router();
  app.use("/federation", noGuest, route)

  route.post('/remote', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    if(typeof req.body.title !== "string") throw "Invalid title"
    let remote = new Remote(req.body)
    res.json(remote.toObj())
  });

  route.get('/remote', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(Remote.all().map(f => f.toObj()));
  });

  route.delete('/remote/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    remote.delete();
    res.json({success: true});
  });

  route.get('/remote/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    res.json(remote.toObj());
  });

  route.post('/remote/:id/test', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    remote.get("me")
          .catch(error => res.json({error, success: false}))
          .then(user => res.json({userId: user?.id, name: user?.name, success: !!user?.id}))
  });

  route.post('/remote/test', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    Remote.testConfig(req.body).then(result => res.json(result))
  });

  route.patch('/remote/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    if(typeof req.body.title === "string" && req.body.title) remote.title = req.body.title;
    if(typeof req.body.url === "string" && req.body.url) remote.url = req.body.url;
    if(typeof req.body.apiKey === "string" && req.body.apiKey) remote.apiKey = req.body.apiKey;
    res.json(true);
  });

  // Roles
  route.get("/setup/role", (req, res) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(Role.all().map(role => ({
      id: role.id,
      enabled: role.tags.includes("federation")
    })));
  })

  route.patch("/setup/role/:id", (req, res) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let role = Role.lookup(req.params.id)
    if(!role) return res.sendStatus(404);
    if(typeof req.body.enabled === "boolean") req.body.enabled ? role.tag("federation") : role.removeTag("federation");
    res.json({success: true});
  })

  // API keys
  route.get('/setup/apikey', (req, res) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(query.type(APIKey).tag("apikey").tag("federation").all.map(k => k.toObj()))
  });

  route.post("/setup/apikey", (req, res) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    if (!req.body.name || !req.body.key || !req.body.userId) throw "name, key and userId are mandatory"
    let user = User.lookup(req.body.userId)
    if (!user) throw `User ${req.body.userId} doesn't exist`
    let key = new APIKey(req.body.name, req.body.key, user, false)
    key.tag("federation")
    res.json({success: true});
  })
};