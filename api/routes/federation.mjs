import express from "express"
const { Router, Request, Response } = express;
import {noGuest, validateAccess} from "../../services/auth.mjs"
import Remote from "../../models/remote.mjs"
import Setup from "../../models/setup.mjs";

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
  
  route.get('/setup', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let setup = Setup.lookup()
    res.json({
      identifier: setup.identifier||null
    });
  });
  
  route.patch('/setup', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let setup = Setup.lookup()
    if(typeof req.body.identifier === "string" || !req.body.identifier) setup.identifier = req.body.identifier||null;
    res.json(true);
  });
};