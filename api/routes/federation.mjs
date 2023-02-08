import express from "express"
const { Router, Request, Response } = express;
import {noGuest, permission, validateAccess} from "../../services/auth.mjs"
import Remote from "../../models/remote.mjs"
import Setup from "../../models/setup.mjs";
import APIKey from "../../models/apikey.mjs";

export default (app) => {

  const route = Router();
  app.use("/federation", noGuest, route)

  route.post('/remote', permission("admin"),  (req, res, next) => {
    if(typeof req.body.title !== "string") throw "Invalid title"
    let remote = new Remote(req.body)
    res.json(remote.toObj())
  });

  route.get('/remote', permission("admin"), (req, res, next) => {
    res.json(Remote.all().map(f => f.toObj()));
  });

  route.delete('/remote/:id', permission("admin"), (req, res, next) => {
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    remote.delete();
    res.json({success: true});
  });

  route.get('/remote/:id', permission("admin"), (req, res, next) => {
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    res.json(remote.toObj());
  });

  route.post('/remote/:id/test', permission("admin"), async (req, res, next) => {
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    remote.get("me")
          .catch(error => res.json({error, success: false}))
          .then(user => res.json({userId: user?.id, name: user?.name, success: !!user?.id}))
  });

  route.post('/remote/test', permission("admin"), (req, res, next) => {
    Remote.testConfig(req.body).then(result => res.json(result))
  });

  route.post('/remote/:id/refresh', permission("admin"), (req, res, next) => {
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    remote.refresh().catch(err => res.json({success: false, err}))
                    .then(() => res.json({success: true}))
  });

  route.patch('/remote/:id', permission("admin"), (req, res, next) => {
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    if(typeof req.body.title === "string" && req.body.title) remote.title = req.body.title;
    if(typeof req.body.url === "string" && req.body.url) remote.url = req.body.url;
    if(typeof req.body.apiKey === "string" && req.body.apiKey) remote.apiKey = req.body.apiKey;
    res.json(true);
  });
  
  route.get('/setup', permission("admin"), (req, res, next) => {
    let setup = Setup.lookup()
    res.json({
      identifier: setup.identifier||null
    });
  });
  
  route.patch('/setup', permission("admin"), (req, res, next) => {
    let setup = Setup.lookup()
    if(typeof req.body.identifier === "string" || !req.body.identifier) setup.identifier = req.body.identifier||null;
    res.json(true);
  });

  route.get('/:fed/me/token', noGuest, permission("user.federate"), async (req, res) => {
    let remote = Remote.lookupIdentifier(req.params.fed)
    if(!remote) throw "Unknown identifier: " + req.params.fed;
    remote.get('me/token', {user: res.locals.user}).catch(err => {
      console.log(`Could not get token for user ${res.locals.user.id} from remote ${remote.title}`)
      res.sendStatus(500)
    }).then(token => {
      res.json(token)
    })
  })
};