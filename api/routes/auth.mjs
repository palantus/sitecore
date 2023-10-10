import express from "express"
const { Router, Request, Response } = express;
const route = Router();

import service, { noGuest } from "../../services/auth.mjs"
import jwt from 'jsonwebtoken'
import {sanitize} from "entitystorage"
import User from "../../models/user.mjs"
import { lookupUserPermissions, lookupUserRoles} from '../../tools/usercache.mjs';
import Setup from "../../models/setup.mjs";
import { getSignInURL } from "../../services/mslogin.mjs";
import LogEntry from "../../models/logentry.mjs";

export default (app) => {

  let guest = null;

  if (process.env.ADMIN_MODE === "true")
    console.log("Warning: Is in ADMIN mode, which means that user requests aren't authorized")

  global.sitecore.loginURL = `${global.sitecore.apiURL}/auth/login`

  app.use("/auth", route)

  route.get('/redirect', async function (req, res, next) {
    try{
      if(req.query.error){
        LogEntry.create(`${req.query.error}: ${req.query.error_description}`, "mslogin")
        console.log("token response", req.query)
        return res.sendStatus(500)
      }

      if(!req.query.code){
        LogEntry.create(`No code returned from ms login`, "mslogin")
        console.log("token response", req.query)
        return res.sendStatus(500)
      }

      let loginResult = await service.login(req.query)

      let user = loginResult?.user

      if (user) {
        let data = user.toObj();
        let token = jwt.sign(data, global.sitecore.accessTokenSecret, { expiresIn: '7d' })
        //res.cookie('jwtToken', token, { domain: global.sitecore.cookieDomain, maxAge: 90000000, httpOnly: true, secure: true, sameSite: "None" });
        if (loginResult?.state?.redirect) {
          let url = new URL(loginResult.state.redirect)
          url.searchParams.set("token", token);
          res.redirect(url)
        } else {
          res.end("Login successful! You can close this window/tab now")
        }
      } else {
        res.send(`<html><body><h1>Oops</h1><p>Your account has not been authorized to login as a user. Contact administrator, if you believe this to be a mistake.</p><a href="${global.sitecore.siteURL}/login">Go back to site</a></body></html>`)
      }
    } catch(err){
      console.log(err)
      res.status(501).json({success: false, error: "Failed to log in"})
    }
  });

  route.post('/login', (req, res, next) => {
    let user = User.lookup(sanitize(req.body.username));

    if(!user || !user.active || !user.hasPassword() || !user.validatePassword(req.body.password)){
      return res.json({success: false})
    }

    let token = jwt.sign(user.toObj(), global.sitecore.accessTokenSecret, { expiresIn: '7d' })
    //res.cookie('jwtToken', token, { domain: global.sitecore.cookieDomain, maxAge: 604800000 /* 7 days */, httpOnly: true, secure: true, sameSite: "None" });
    res.json({success: true, token})
	})

  route.get('/login', (req, res, next) => {
    getSignInURL(req.query.scopes?.split(" ") || ["user.read"], req.query.redirect||null).catch(err => {
      console.log(err)
      res.sendStatus(500)
    }).then(url => {
      res.redirect(url);
    })
  })

  route.use("/logout", (req, res, next) => {
    res.json({ success: true })
  })

  app.use('/', async (req, res, next) => {
    if (process.env.ADMIN_MODE === "true") {
      let admin = service.getAdmin();
      res.locals.user = admin
      res.locals.roles = lookupUserRoles(admin)
      res.locals.permissions = lookupUserPermissions(admin);
      next();
      return;
    }
    let user;
    const authHeader = req.headers['authorization']
    let token;

    if(res.locals.user?._id){
      user = res.locals.user; // In case a mod already found the user using some other form of authentication
    }

    if (!user) {
      if(res.locals.token)
        token = res.locals.token //Allow mods to set token
      else if (req.query.token)
        token = req.query.token
      else if (req.query.access_token)
        token = req.query.access_token
      else if (authHeader && authHeader.startsWith("Basic"))
        token = Buffer.from(authHeader.split(" ")[1], 'base64').toString().split(':')?.[1] || authHeader.split(" ")[1]
      else if (authHeader)
        token = authHeader.split(' ')[1]
      //else if (req.cookies.jwtToken)
      //  token = req.cookies.jwtToken

      token = (token && typeof token === "string") ? sanitize(token) : null;
    
      if(token){
        try{
          let {user: foundUser, responseCode, response, authMethod} = await service.tokenToUser(token, req.headers["impersonate-user"], req.headers["x-sitecore-federate"])
          if(foundUser){
            user = foundUser;
            res.locals.jwt = token;
            res.locals.authMethod = authMethod;
          } else {
            return res.status(responseCode||401).json(response || "Could not find user from token")
          }
        } catch(err){
          console.log(err)
          res.status(501).json({success: false, error: "Failed to log in"})
        }
      }
    }

    if(!user){
      user = guest = guest || User.lookup("guest")
    }

    res.locals.user = user
    res.locals.roles = lookupUserRoles(user)
    res.locals.permissions = lookupUserPermissions(user)
    res.locals.shareKey = req.query.shareKey || req.headers['share-key']
    next();
  });

  app.get('/auth/refresh-token', noGuest, (req, res, next) => {
    if(!res.locals.jwt) return res.json(null)
    let decoded
    try{
      decoded = jwt.decode(res.locals.jwt);
    } catch {
      return res.json(null)
    }
    if(!decoded?.exp) return res.json(null)

    let expires = new Date()
    expires.setTime(decoded.exp * 1000)

    let tomorrow = new Date()
    tomorrow.setDate(new Date().getDate() + 1)

    if(tomorrow.getTime() > expires.getTime()){
      let token = jwt.sign(res.locals.user.toObj(), global.sitecore.accessTokenSecret, { expiresIn: '7d' })
      //res.cookie('jwtToken', token, { domain: global.sitecore.cookieDomain, maxAge: 604800000 /* 7 days */, httpOnly: true, secure: true, sameSite: "None" });
      return res.json(token)
    }

    return res.json(null)
	})
};