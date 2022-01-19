import dotenv from 'dotenv'
dotenv.config()

import express from "express"
const { Router, Request, Response } = express;
const route = Router();

import service from "../../services/auth.mjs"
import { service as userService } from "../../services/user.mjs"
import jwt from 'jsonwebtoken'
import Entity from "entitystorage"
import yargs from "yargs"
import User from "../../models/user.mjs"
import APIKey from '../../models/apikey.mjs';
const cliArgs = yargs.argv

let domain = process.env.APIDOMAIN || process.env.DOMAIN || cliArgs.domain
let cookieDomain = process.env.COOKIEDOMAIN || process.env.APIDOMAIN || process.env.DOMAIN
let isDev = process.env.ISDEV === "TRUE"
export let axmURL = `http${isDev ? '' : 's'}://${domain}`;

export default (app) => {

  if (!domain)
    console.log("ERROR: Please provide a domain in cli args (domain) or .env (APIDOMAIN)")

  if (process.env.ADMIN_MODE === "true")
    console.log("Warning: Is in dev mode, which means that user requests aren't authorized")

  if (process.env.LOGIN_URL && process.env.LOGIN_URL.indexOf("<domain>")) {
    process.env.LOGIN_URL = process.env.LOGIN_URL.replace("<domain>", domain) + (service.apiPrefix ? "/" + service.apiPrefix : "")
  }

  app.use("/auth", route)

  route.get('/redirect', async function (req, res, next) {
    const requestToken = req.query.code
    const state = req.query.state

    let { user, msUser } = await service.login(requestToken)
    if (user) {
      let data = user.toObj();
      data.activeMSUser = msUser?.id
      let token = jwt.sign(data, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
      //console.log(token)
      res.cookie('jwtToken', token, { domain: cookieDomain, maxAge: 90000000, httpOnly: true, secure: true, sameSite: "None" });
      if (state.startsWith("http")) {
        let url = new URL(decodeURIComponent(state))
        url.searchParams.set("token", token);
        console.log(`1: redirecting to: ${url}`)
        res.redirect(url)
      } else {
        res.redirect(`${axmURL}/loginsuccess.html`)
      }
    } else {
      //res.sendStatus(404)
      if (state.startsWith("http")) {
        let url = new URL(decodeURIComponent(state))
        console.log(`2: redirecting to: ${url}`)
        res.redirect(url)
      } else {
        res.redirect(`${axmURL}/loginnouser.html`)
      }
    }
  });

  route.post('/login', async (req, res, next) => {
    let user = null;
    if(process.env.ADMIN_PASS && req.body.username == "admin"){
      if(req.body.password != process.env.ADMIN_PASS){
        return res.json({success: false})
      }
      user = service.getAdmin();
    } else {
      user = User.lookup(req.body.username);
      if(!user.active || !user.hasPassword() || !user.validatePassword(req.body.password)){
        return res.json({success: false})
      }
    }

    let token = jwt.sign(user.toObj(), process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
    res.cookie('jwtToken', token, { domain: cookieDomain, maxAge: 604800000 /* 7 days */, httpOnly: true, secure: true, sameSite: "None" });
    res.json({success: true, token})
	})

  route.get('/login', async (req, res, next) => {
    var redirect = new URL(req.query.redirect);
    console.log(`3: redirecting to: ${process.env.LOGIN_URL}${redirect ? encodeURIComponent(redirect) : ""}`)
    res.redirect(`${process.env.LOGIN_URL}${redirect ? encodeURIComponent(redirect) : ""}`)
  })

  route.use("/logout", (req, res, next) => {
    res.cookie('jwtToken', "", { domain: cookieDomain, maxAge: 1000, httpOnly: true, secure: true, sameSite: "None" });
    res.json({ success: true })
  })

  app.use('/', async (req, res, next) => {
    if (process.env.ADMIN_MODE === "true") {
      let admin = service.getAdmin();
      res.locals.user = admin
      res.locals.roles = admin.roles
      next();
      return;
    }
    let user;
    const authHeader = req.headers['authorization']
    let token;

    if(res.locals.user?._id){
      user = res.locals.user; // In case a mod already found the user using some other form of authentication
    }

    if (!user && !res.finished) {
      if(res.locals.token)
        token = res.locals.token //Allow mods to set token
      else if (req.query.token)
        token = req.query.token
      else if (authHeader && authHeader.startsWith("Basic"))
        token = Buffer.from(authHeader.split(" ")[1], 'base64').toString().split(':')[1]
      else if (authHeader)
        token = authHeader.split(' ')[1]
      else if (req.cookies.jwtToken)
        token = req.cookies.jwtToken
      if (!token)
        return res.status(401).json({ error: "Not logged in", redirectTo: process.env.LOGIN_URL })

      if (token == process.env.AXMAN_API_KEY) {
        user = service.getAxManUser();
      } 
      
      if(!user){
        let userId = userService.authTokenToUserId(token)
        if (userId) {
          user = service.lookupUser(userId)
        }
      }

      if(!user && token && token.length < 100){
        let apiKey = APIKey.tokenToKey(token)
        if (apiKey) {
          user = User.from(apiKey.related.user);
        }
      }
    }

    if (!user && !res.finished) {
      user = await new Promise(resolve => {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
          if (err) return res.status(401).json({ error: "Session expired", redirectTo: process.env.LOGIN_URL })
          if (!user.id) return res.status(401).json({ error: "No user in session", redirectTo: process.env.LOGIN_URL })
          resolve(service.lookupUser(user.id))
        })
      })
    }

    if (!user && !res.finished) {
      return res.status(401).json({ error: "Could not log you in", redirectTo: process.env.LOGIN_URL })
    }

    let roles = user.roles;
    if (req.headers["impersonate-user"] && roles.includes("admin")) {
      user = service.lookupUser(req.headers["impersonate-user"]);
      roles = user.roles
    }
    
    if(!user.active){
      return res.status(401).json({ error: `The user ${user.id} is deactivated`, redirectTo: process.env.LOGIN_URL })
    }

    res.locals.user = user
    res.locals.roles = roles
    next();
  });

};