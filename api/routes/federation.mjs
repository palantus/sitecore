import express from "express"
const { Router, Request, Response } = express;
import {noGuest, permission, validateAccess} from "../../services/auth.mjs"
import Remote from "../../models/remote.mjs"
import Setup from "../../models/setup.mjs";
import APIKey from "../../models/apikey.mjs";
import url from "url"

export default (app) => {

  const route = Router();
  app.use("/federation", route)

  route.post('/remote', permission("admin"),  (req, res, next) => {
    if(typeof req.body.title !== "string") throw "Invalid title"
    let remote = new Remote(req.body)
    remote.refresh().catch(err => null);
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
    try{
      let user = await remote.get("me")
      res.json({userId: user?.id, name: user?.name, success: !!user?.id})
    } catch(error){
      res.json({error, success: false})
    }
  });

  route.post('/remote/test', permission("admin"), async (req, res, next) => {
    try{
      let result = await Remote.testConfig(req.body)
      res.json(result)
    } catch(error){
      res.json({success: false, error})
    }
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

  route.all('/:fed/api/*', noGuest, permission("user.federate"), async (req, res) => {
    let path = decodeURI(req.path.substring(5)).split("/").slice(1).join("/")
    let remote = Remote.lookupIdentifier(req.params.fed)
    if(!remote) {
      if(Setup.lookup().identifier == req.params.fed) {
        let redirectUrl = url.format({pathname: `/api/${path}`, query: req.query});
        return res.redirect(redirectUrl);
      } else {
        return res.sendStatus(404);
      }
    }
    try{
      let query = req.query;
      delete query.token;
      delete query.impersonate;
      let redirectUrl = url.format({pathname: path, query});
      let response;
      switch(req.method){
        case "GET":
          response = await remote.get(redirectUrl, {user: res.locals.user, returnRaw: true, ignoreErrors: true})
          break;
        case "DELETE":
          response = await remote.del(redirectUrl, {user: res.locals.user, returnRaw: true, ignoreErrors: true})
          break;
        case "POST":
          response = await remote.post(redirectUrl, req.body, {user: res.locals.user, returnRaw: true, ignoreErrors: true})
          break;
        case "PATCH":
          response = await remote.patch(redirectUrl, req.body, {user: res.locals.user, returnRaw: true, ignoreErrors: true})
          break;
        default:
          return res.sendStatus(404);
      }
      let headers = {}
      if(response.headers?.get("Content-Disposition")) headers["Content-Disposition"] = response.headers.get("Content-Disposition");
      if(response.headers?.get("Content-Type")) headers["Content-Type"] = response.headers.get("Content-Type");
      if(response.headers?.get("Content-Length")) headers["Content-Length"] = response.headers.get("Content-Length");
      res.writeHead(response.status, headers)
      response.body.pipe(res)
    } catch(err) {
      console.log(`Could not get ${path} on ${remote.identifier} for ${res.locals.user.id} from remote ${remote.title}`)
      console.log(err)
      res.sendStatus(500)
    }
  })
};