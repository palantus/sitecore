"use strict"

import fetch from "node-fetch"
import User from "../models/user.mjs"
import MSUser from "../models/msuser.mjs"
import yargs from "yargs";
const cliArgs = yargs.argv;

import dotenv from 'dotenv'
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
      throw "Please enter AZURE_APP_CLIENTID and AZURE_APP_SECRET in .env file"
  }

  async login(code, redirect) {
    if (!this.clientId || !this.secret)
      throw "Please enter AZURE_APP_CLIENTID and AZURE_APP_SECRET in .env file"

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

  getAxManUser() {
    let user = User.lookup("axman")
    if (!user) {
      user = new User("axman", { name: "AxManagement" })
    }
    return user;
  }

  getAdmin(){
    let admin = User.find("tag:user tag:admin")
    if(!admin) {
      admin = new User("admin", {name: "Admin"}).tag("admin");
      console.log("Created user 'admin'")
    }
    return admin;
  }

  lookupUser(userId) {
    return User.lookup(userId)
  }

  validateAccess(req, res, rule){
    let roles = res.locals.roles || [];

    if(rule.role && roles.includes(rule.role))
      return true;
    if(rule.roles && roles.find(t => rule.roles.includes(t)))
      return true;

    console.log(`Unauthorized access by user ${res.locals.user?.id}: ${req.method} ${req.originalUrl}`)
    res.status(403).json({ error: `You do not have access to ${req.method} ${req.originalUrl}` })

    return false;
  }
}

let service = new Service();
export default service
export function validateAccess(...args){return service.validateAccess(...args)}