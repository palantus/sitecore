import config from "../config/index.mjs"
import { v4 as uuidv4 } from 'uuid';
import fs from "fs"

export default ({mode, storagePath}) => {
  let setup = {}

  let setupToAppend = ""

  setup.siteHost = process.env.SITE_HOST || (mode == "combined" ? process.env.API_HOST : null)
  setup.apiHost = mode == "combined" ? setup.siteHost : process.env.API_HOST || setup.siteHost
  setup.isSecure = !!(process.env.SECURE == "TRUE" || process.env.SECURE == "true")

  if(!setup.apiHost) {
    setup.apiHost = `localhost:${config(mode).port}`
    setupToAppend += `\nAPI_HOST=${setup.apiHost}`
  }

  if(!setup.siteHost) {
    setup.siteHost = `localhost:${config(mode).port}`
    setupToAppend += `\nSITE_HOST=${setup.siteHost}`
  }

  setup.serverMode = mode
  setup.siteURL = `http${setup.isSecure?'s':''}://${setup.siteHost}`
  setup.apiPrefix = mode == "combined" ? "api" : ""
  setup.apiURL = `http${setup.isSecure?'s':''}://${setup.apiHost}${setup.apiPrefix?`/${setup.apiPrefix}` : ''}`
  setup.wsURL = `ws${setup.isSecure?'s':''}://${setup.apiHost}`
  setup.cookieDomain = process.env.COOKIEDOMAIN || setup.apiHost

  setup.accessTokenSecret = process.env.ACCESS_TOKEN_SECRET

  if(!setup.accessTokenSecret){
    setup.accessTokenSecret = uuidv4()
    setupToAppend += `\nACCESS_TOKEN_SECRET=${setup.accessTokenSecret}`
  }

  setup.storagePath = storagePath

  if(setupToAppend){
    fs.appendFile(".env", setupToAppend, function (err) {
      if (err) throw err;
      console.log('Updated .env with default configuration');
    });
  }

  global.sitecore = setup

  console.log(global.sitecore)
}