import express from "express"
const { Router, Request, Response } = express;
const route = Router();

import service, { noGuest } from "../../services/auth.mjs"
import jwt from 'jsonwebtoken'
import {sanitize} from "entitystorage"
import User from "../../models/user.mjs"
import { lookupUserPermissions, lookupUserRoles} from '../../tools/usercache.mjs';
import Setup from "../../models/setup.mjs";

export default (app) => {

  let guest = null;

  if (process.env.ADMIN_MODE === "true")
    console.log("Warning: Is in ADMIN mode, which means that user requests aren't authorized")

  global.sitecore.loginURL = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${Setup.lookup().msSigninClientId}&response_type=code&redirect_uri=${encodeURIComponent(`${global.sitecore.apiURL}/auth/redirect`)}&response_mode=query&scope=offline_access%20https%3A%2F%2Fgraph.microsoft.com%2Fuser.read&state=`

  app.use("/auth", route)

  route.get('/redirect', async function (req, res, next) {
    const requestToken = req.query.code
    const state = req.query.state

    try{
      let loginResult = await service.login(requestToken)

      let user = loginResult?.user
      let msUser = loginResult?.msUser

      if (user) {
        let data = user.toObj();
        let token = jwt.sign(data, global.sitecore.accessTokenSecret, { expiresIn: '7d' })
        //console.log(token)
        res.cookie('jwtToken', token, { domain: global.sitecore.cookieDomain, maxAge: 90000000, httpOnly: true, secure: true, sameSite: "None" });
        if (state.startsWith("http")) {
          let url = new URL(decodeURIComponent(state))
          url.searchParams.set("token", token);
          res.redirect(url)
        } else {
          res.redirect(`${global.sitecore.apiURL}/loginsuccess.html`)
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
    res.cookie('jwtToken', token, { domain: global.sitecore.cookieDomain, maxAge: 604800000 /* 7 days */, httpOnly: true, secure: true, sameSite: "None" });
    res.json({success: true, token})
	})

  route.get('/login', (req, res, next) => {
    var redirect = new URL(req.query.redirect);
    res.redirect(`${global.sitecore.loginURL}${redirect ? encodeURIComponent(redirect) : ""}`)
  })

  route.use("/logout", (req, res, next) => {
    res.cookie('jwtToken', "", { domain: global.sitecore.cookieDomain, maxAge: 1000, httpOnly: true, secure: true, sameSite: "None" });
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
      else if (req.cookies.jwtToken)
        token = req.cookies.jwtToken

      token = (token && typeof token === "string") ? sanitize(token) : null;
    
      if(token){
        try{
          let {user: foundUser, responseCode, response} = await service.tokenToUser(token, req.headers["impersonate-user"])
          if(foundUser){
            user = foundUser;
            res.locals.jwt = token
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
      res.cookie('jwtToken', token, { domain: global.sitecore.cookieDomain, maxAge: 604800000 /* 7 days */, httpOnly: true, secure: true, sameSite: "None" });
      return res.json(token)
    }

    return res.json(null)
	})
};