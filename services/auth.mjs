"use strict"

import fetch from "node-fetch"
import User from "../models/user.mjs"
import MSUser from "../models/msuser.mjs"
import yargs from "yargs";
const cliArgs = yargs.argv;

import dotenv from 'dotenv'
import Role from "../models/role.mjs";
import { lookupUserFromJWT, cacheJWT, lookupUserPermissions} from "../tools/usercache.mjs";
import { sanitize } from "entitystorage";
import { service as userService } from "./user.mjs"
import jwt from 'jsonwebtoken'
import APIKey from "../models/apikey.mjs";
dotenv.config()

let isDev = process.env.ISDEV === "TRUE"
if (isDev) console.log("Running auth in developer mode (non-ssl)")

class Service {
  init(){
    this.apiPrefix = process.env.API_PREFIX || (global.sitecore_mode == "combined" ? "api" : "");
    this.clientId = process.env.AZURE_APP_CLIENTID  //from azure app
    this.scope = "https%3A%2F%2Fgraph.microsoft.com%2Fuser.read" //inkluder %20offline_access for refresh_token. %20 er fordi det er space separeret.
    this.redirect = `http${isDev ? '' : 's'}://${cliArgs.domain || process.env.APIDOMAIN || process.env.DOMAIN}${this.apiPrefix ? "/" + this.apiPrefix : ""}/auth/redirect`  //registrered on azure app
    this.secret = process.env.AZURE_APP_SECRET //from azure app

    if (!this.clientId || !this.secret)
      console.log("AZURE_APP_CLIENTID and AZURE_APP_SECRET must be in .env file to enable MS login")
  }

  async login(code, redirect) {
    if (!this.clientId || !this.secret)
      return null;

    let res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        // Note offline_access: necessary for getting refresh_token
        body: `client_id=${this.clientId}&scope=${this.scope}&code=${code}&redirect_uri=${redirect || this.redirect}&grant_type=authorization_code&client_secret=${this.secret}`
      })
    res = await res.json();

    if (res.error) {
      console.log("Got error logging user in")
      console.log(res)
    }

    let msUserRemote = await (await fetch("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${res.access_token}` } })).json()

    if (!msUserRemote)
      return null;

    if (msUserRemote.error) {
      console.log("Got error asking for user info")
      console.log(msUserRemote.error)
      return;
    }

    let msUser = MSUser.lookup(msUserRemote.userPrincipalName)

    if (msUser) {
      msUser.name = msUserRemote.displayName;
      msUser.id = msUserRemote.id;
    } else {
      msUser = new MSUser(msUserRemote.id, { email: msUserRemote.userPrincipalName, name: msUserRemote.displayName })
      console.log("Created new msuser " + msUserRemote.userPrincipalName)
    }

    let user = User.from(msUser.related.user);
    return { user, msUser };
  }

  async tokenToUser(token, impersonate = null){
    let user = null;
    
    if(!user){
      let userId = userService.authTokenToUserId(token)
      if (userId) {
        user = this.lookupUser(userId)
      }
    }

    if(!user && token && token.length < 100){
      let apiKey = APIKey.tokenToKey(token)
      if (apiKey) {
        user = User.from(apiKey.related.user);
      }
    }

    if (!user) {
      user = lookupUserFromJWT(token)
    }

    if(!user){
      let potentialUser = await new Promise(resolve => {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
          if (err) return resolve({user: null, responseCode: 401, response: { error: `Session expired`, redirectTo: process.env.LOGIN_URL }})
          if (!user.id) return resolve({user: null, responseCode: 401, response: { error: `No user in session`, redirectTo: process.env.LOGIN_URL }})
          resolve({user: cacheJWT(token, this.lookupUser(user.id))})
        })
      })
      if(!potentialUser.user)
        return potentialUser
      user = potentialUser.user
    }

    if (!user) {
      return {user: null, responseCode: 401, response: { error: "Could not log you in", redirectTo: process.env.LOGIN_URL }}
    }

    if (impersonate && lookupUserPermissions(user).includes("user.impersonate")) {
      user = this.lookupUser(sanitize(impersonate));
      if(!user){
        return {user: null, responseCode: 404, response: { error: `The user to impersonate doesn't exist`, redirectTo: process.env.LOGIN_URL }}
      }
    }
    
    if(!user.active){
      return {user: null, responseCode: 401, response: { error: `The user ${user.id} is deactivated`, redirectTo: process.env.LOGIN_URL }}
    }

    return {user, responseCode: null, response: null};
  }

  getAxManUser() {
    let user = User.lookup("axman")
    if (!user) {
      user = new User("axman", { name: "AxManagement" })
    }
    return user;
  }

  getAdmin(){
    let admin = User.find("tag:user prop:id=admin role.prop:id=admin") || User.find("tag:user role.prop:id=admin")
    if(!admin) {
      admin = User.find("tag:user prop:id=admin")
      if(!admin)
        admin = new User("admin", {name: "Admin"}).tag("admin");
      admin.rel(Role.lookupOrCreate("admin"), "role")

      console.log("Added admin user")
    }
    return admin;
  }

  lookupUser(userId) {
    return User.lookup(userId)
  }

  validateAccess(req, res, rule){
    let roles = res.roles || res.locals?.roles || [];
    let permissions = res.permissions || res.locals?.permissions || [];

    if(permissions.includes("admin"))
      return true;

    if(rule.role && roles.includes(rule.role))
      return true;
    if(rule.roles && roles.find(t => rule.roles.includes(t)))
      return true;
      
    if(rule.permission && permissions.includes(rule.permission))
      return true;
    if(rule.permissions && permissions.find(t => rule.permissions.includes(t)))
      return true;

    if(req && res){
      console.log(`Unauthorized access by user ${res.locals.user?.id}: ${req.method} ${req.originalUrl}. Missing: ${JSON.stringify(rule)}`)
      res.status(403).json({ error: `You do not have access to ${req.method} ${req.originalUrl}. Missing: ${JSON.stringify(rule)}` })
    } else {
      console.log(`Unauthorized access by user ${res.user?.id || res.locals?.user?.id||"N/A"}: Missing: ${JSON.stringify(rule)}`)
      throw `Unauthorized access by user ${res.user?.id || res.locals?.user?.id || "N/A"}. Missing: ${JSON.stringify(rule)}`
    }

    return false;
  }

  hasPermission(context, permissionId){
    let permissions = context.permissions || context.locals?.permissions || [];
    if(permissions.includes("admin"))
      return true;
    if(permissions.includes(permissionId))
      return true;
    return false;
  }

  ifPermission(context, permissionId, returnValue){
    if(this.hasPermission(context, permissionId))
      return returnValue;
    return null;
  }

  ifPermissionThrow(context, permissionId, returnValue){
    if(this.hasPermission(context, permissionId))
      return returnValue;
    console.log(context, permissionId)
    throw `Unauthorized access by user ${context.user?.id || context.locals?.user?.id || "N/A"}`
  }
}

let service = new Service();
export default service
export function validateAccess(...args){return service.validateAccess(...args)}
export function ifPermission(...args){return service.ifPermission(...args)}
export function ifPermissionThrow(...args){return service.ifPermissionThrow(...args)}