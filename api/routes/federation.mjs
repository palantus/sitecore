import express from "express"
const { Router } = express;
import { noGuest, permission} from "../../services/auth.mjs"
import Remote from "../../models/remote.mjs"
import Setup from "../../models/setup.mjs";
import url from "url"
import User from "../../models/user.mjs";
import jwt from 'jsonwebtoken'
import LogEntry from "../../models/logentry.mjs";
import { service } from "../../services/user.mjs";

export default (app) => {

  const route = Router();
  app.use("/federation", route)

  route.post('/remote', permission("admin"),  (req, res) => {
    if(typeof req.body.title !== "string") throw "Invalid title"
    let remote = new Remote(req.body)
    remote.refresh().catch(() => null);
    res.json(remote.toObj())
  });

  route.get('/remote', permission("admin"), (req, res) => {
    res.json(Remote.all().map(f => f.toObj()));
  });

  route.delete('/remote/:id', permission("admin"), (req, res) => {
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    remote.delete();
    res.json({success: true});
  });

  route.get('/remote/:id', permission("admin"), (req, res) => {
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    res.json(remote.toObj());
  });

  route.post('/remote/:id/test', permission("admin"), async (req, res) => {
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    try{
      let user = await remote.get("me")
      res.json({userId: user?.id, name: user?.name, success: !!user?.id})
    } catch(error){
      res.json({error, success: false})
    }
  });

  route.post('/remote/test', permission("admin"), async (req, res) => {
    try{
      let result = await Remote.testConfig(req.body)
      res.json(result)
    } catch(error){
      res.json({success: false, error})
    }
  });

  route.post('/remote/:id/refresh', permission("admin"), (req, res) => {
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    remote.refresh().catch(err => res.json({success: false, err}))
                    .then(() => res.json({success: true}))
  });

  route.patch('/remote/:id', permission("admin"), (req, res) => {
    let remote = Remote.lookup(req.params.id)
    if (!remote) throw "Unknown remote"
    if(typeof req.body.title === "string" && req.body.title) remote.title = req.body.title;
    if(typeof req.body.url === "string" && req.body.url) remote.url = req.body.url;
    if(typeof req.body.apiKey === "string" && req.body.apiKey) remote.apiKey = req.body.apiKey;
    res.json(true);
  });
  
  route.get('/setup', permission("admin"), (req, res) => {
    let setup = Setup.lookup()
    res.json({
      identifier: setup.identifier||null
    });
  });
  
  route.patch('/setup', permission("admin"), (req, res) => {
    let setup = Setup.lookup()
    if(typeof req.body.identifier === "string" || !req.body.identifier) setup.identifier = req.body.identifier||null;
    res.json(true);
  });
  
  route.post('/:fed/login', (req, res) => {
    if(!req.body.username || !req.body.password) throw "username and password are mandatory";
    let userId = req.body.username.split("@")[0]
    let user = User.lookup(userId);

    if(!user || !user.active || !user.hasPassword() || !user.validatePassword(req.body.password)){
      return res.json({success: false})
    }

    let remote = Remote.lookupIdentifier(req.params.fed)
    if(!remote) return res.sendStatus(404);

    remote.get(`federation/user/${req.body.username}/jwt`)
    .then(result => {
      res.json(result)
    }).catch(error => {
      new LogEntry(error, "federation")
      res.status(500).send({success: false, error}).end();
    })
	})
  
  route.get('/user/:user/jwt', noGuest, (req, res) => {
    let user = User.lookup(req.params.user);
    if(!user) throw "Unknown user"
    let apiKey = res.locals.authMethod?.apiKey;
    if(!apiKey.federation || !apiKey.identifier || !user.id.endsWith(apiKey.identifier)) throw "Not possible with the current authentication. Please use a federation API key.";
    let token = jwt.sign(user.toObj(), global.sitecore.accessTokenSecret, { expiresIn: '7d' });
    res.json({success: true, token})
  })

  route.get('/:fed/api/me/token', noGuest, (_, res) => {
    // Forwarding a temp token request to the sub does not make sense, since it is the parent/host that handles authentication.
    res.json({token: service.getTempAuthToken(res.locals.user)});
  })

  route.all('/:fed/api/*', async (req, res) => {
    let path = decodeURI(req.path.split("/").slice(3).join("/")) // Go from eg. "/test/api/me" to "me"
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
      let useGuest = res.locals.user.id == "guest" || !res.locals.user.hasPermission("user.federate")
      let customHeaders = {}
      if(req.headers["share-key"]) customHeaders["share-key"] = req.headers["share-key"];

      if(req.headers["x-forward-auth"] == "yes"){
        customHeaders["Authorization"] = req.headers["authorization"];
        if(req.headers["x-sitecore-federate"]) customHeaders["x-SiteCore-Federate"] = req.headers["x-sitecore-federate"];
      }

      switch(req.method){
        case "GET":
          response = await remote.get(redirectUrl, {user: res.locals.user, returnRaw: true, ignoreErrors: true, useGuest, customHeaders})
          break;
        case "DELETE":
          response = await remote.del(redirectUrl, {user: res.locals.user, returnRaw: true, ignoreErrors: true, useGuest, customHeaders})
          break;
        case "POST":
          let contentType = req.headers["content-type"];
          if(req.is("json")){
            response = await remote.post(redirectUrl, req.body, {user: res.locals.user, returnRaw: true, ignoreErrors: true, useGuest, customHeaders})
          } else if(req.files){
            for (let filedef in req.files) {
              let fileObj = Array.isArray(req.files[filedef]) ? req.files[filedef] : [req.files[filedef]]
              for (let f of fileObj) {
                response = await remote.upload(redirectUrl, f.data, f.name, {user: res.locals.user, returnRaw: true, ignoreErrors: true, useGuest, customHeaders});
              }
            }
          } else {
            console.log(typeof req.body, req.body)
            response = await remote.post(redirectUrl, req.body, {user: res.locals.user, returnRaw: true, ignoreErrors: true, useGuest, customHeaders, isRawBody: true, contentType})
          }
          break;
        case "PATCH":
          response = await remote.patch(redirectUrl, req.body, {user: res.locals.user, returnRaw: true, ignoreErrors: true, useGuest, customHeaders})
          break;
        default:
          return res.sendStatus(404);
      }
      let headers = {} // Don't try to set the headers below to null or undefined, to "not set them". It won't work.
      if(response.headers?.get("Content-Disposition")) headers["Content-Disposition"] = response.headers.get("Content-Disposition");
      if(response.headers?.get("Content-Type")) headers["Content-Type"] = response.headers.get("Content-Type");
      if(response.headers?.get("Content-Length")) headers["Content-Length"] = response.headers.get("Content-Length");
      if(response.headers?.get("Cache-Control")) headers["Cache-Control"] = response.headers.get("Cache-Control");
      if(response.headers?.get("Vary")) headers["Vary"] = response.headers.get("Vary");
      if(response.headers?.get("ETag")) headers["ETag"] = response.headers.get("ETag");
      res.writeHead(response.status, headers)
      response.body.pipe(res)
    } catch(err) {
      console.log(`Could not ${req.method} ${path} on ${remote.identifier} for ${res.locals.user.id} from remote ${remote.title}`)
      console.log(err)
      res.status(500)
      res.json({success: false, error: err})
    }
  })

  route.get('/:fed/www/*', async (req, res) => {
    let path = decodeURI(req.path.split("/").slice(3).join("/")) // Go from eg. "/test/api/me" to "me"
    let remote = Remote.lookupIdentifier(req.params.fed)
    if(!remote) {
      if(Setup.lookup().identifier == req.params.fed) {
        let redirectUrl = url.format({pathname: `/${path}`, query: req.query});
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
      let response = await remote.get(redirectUrl, {user: res.locals.user, returnRaw: true, ignoreErrors: true, useSiteURL: true, useGuest: true})
      let headers = {} // Don't try to set the headers below to null or undefined, to "not set them". It won't work.
      if(response.headers?.get("Content-Disposition")) headers["Content-Disposition"] = response.headers.get("Content-Disposition");
      if(response.headers?.get("Content-Type")) headers["Content-Type"] = response.headers.get("Content-Type");
      if(response.headers?.get("Content-Length")) headers["Content-Length"] = response.headers.get("Content-Length");
      if(response.headers?.get("Cache-Control")) headers["Cache-Control"] = response.headers.get("Cache-Control");
      if(response.headers?.get("Vary")) headers["Vary"] = response.headers.get("Vary");
      if(response.headers?.get("ETag")) headers["ETag"] = response.headers.get("ETag");
      if(response.headers?.get("share-key")) headers["share-key"] = response.headers.get("share-key");
      res.writeHead(response.status, headers)
      response.body.pipe(res)
    } catch(err) {
      console.log(`Could not get ${path} on ${remote.identifier} for ${res.locals.user.id} from remote ${remote.title}`)
      console.log(err)
      res.sendStatus(500)
    }
  })
};
