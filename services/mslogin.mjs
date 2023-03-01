import Entity, { query } from "entitystorage"
import msal from "@azure/msal-node"
import LogEntry from "../models/logentry.mjs";
import Setup from "../models/setup.mjs";

const cryptoProvider = new msal.CryptoProvider();
let cca = null;

export async function getSignInURL(scopes = ["user.read"], redirect = "/"){
  try{
    const state = cryptoProvider.base64Encode(
      JSON.stringify({
        scopes,
        redirect
      })
    );

    return await cca.getAuthCodeUrl({ scopes, redirectUri: `${global.sitecore.apiURL}/auth/redirect`, state })
  } catch(err){
    console.log(err)
    LogEntry.create("Error getting signin url", "mslogin")
  }
  return null;
}

export async function storeCode(code, _state){
  try{
    const state = JSON.parse(cryptoProvider.base64Decode(_state));

    let response = await cca.acquireTokenByCode({
      code,
      scopes: state.scopes,
      redirectUri: `${global.sitecore.apiURL}/auth/redirect`,
    });
    return {token: response?.accessToken||null, state, response};
  } catch(err){
    console.log(err)
    LogEntry.create("Error getting token from code", "mslogin")
    return {error: "Could not get token from code"};
  }
}

export async function testLogin(username){
  let token = await getToken(username, "user.read");
  if(!token.success) return {success: false, error: "Could not get token"};
  let msUserRemote = await (await fetch("https://graph.microsoft.com/beta/me/profile", { headers: { Authorization: `Bearer ${token.token}` } })).json()
  return msUserRemote?.account?.length > 0 ? {success: true} : {success: false, error: "Invalid response from Microsoft", response: msUserRemote}
}

export async function getToken(username, _scopes = ["user.read"]){
  let scopes = typeof _scopes == "string" ? _scopes.split(" ") : _scopes
  try{
    let accounts = await cca.getTokenCache().getAllAccounts();
    let account = accounts.find(a => a.username == username)
    if(!account){
      LogEntry.create("Cache miss - Your account is unknown", "mslogin")
      return {success: false, errorCode: "unknown-account", error: "Your account is unknown. Please login again."}
    }
    let token = await cca.acquireTokenSilent({ account, scopes})
    return {success: true, token: token.accessToken}
  } catch(err){
    switch(err?.errorCode){
      case "no_tokens_found":
        console.log(err)
        LogEntry.create(err.errorMessage, "mslogin")
        LogEntry.create("Cache miss - redirecting user to authentication flow", "mslogin")
        return {success: false, errorCode: "no-cached-token", error: `Your sign-in has expired. Please login again. Please login again using url: ${global.sitecore.apiURL}/auth/login?scopes=${encodeURIComponent(scopes.join(" "))}`}
      case "invalid_grant":
        console.log(err)
        LogEntry.create(err.errorMessage, "mslogin")
        return {success: false, errorCode: "no-cached-token", error: `Your sign-in is missing permissions. Please login again using url: ${global.sitecore.apiURL}/auth/login?scopes=${encodeURIComponent(scopes.join(" "))}`}
      default:
        console.log(err)
        LogEntry.create(`${err.errorCode}: ${err.errorMessage}`, "mslogin")
        return {success: false, errorCode: err?.errorCode, error: "An unknown error occured. Please try again"}
    }
  }
}

export function clearCache(){
  cca?.clearCache()
  query.tag("mslogin-cca-cache").first?.delete();
}

export async function initMSLogin(){
  if(cca) return; // Already initialized
  let system = Setup.lookup();
  if(!system.msSigninClientId || !system.msSigninSecret){
    LogEntry.create("WARNING: Missing setup for Microsoft login. MS login won't work.")
    return;
  }
  const config = {
    auth: {
        clientId: system.msSigninClientId,
        authority: `https://login.microsoftonline.com/${system.msSigninTenant||"common"}`,
        clientSecret: system.msSigninSecret
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Error,
        }
    },
    cache: {
      cachePlugin:{
        beforeCacheAccess: async (cacheContext) => {
          let e = query.tag("mslogin-cca-cache").first
          cacheContext.tokenCache.deserialize(e?.content||null);
        },
        afterCacheAccess: (cacheContext) => {
          if(cacheContext.cacheHasChanged) {
            let e = query.tag("mslogin-cca-cache").first || new Entity().tag("mslogin-cca-cache");
            e.content = cacheContext.tokenCache.serialize()
          }
        }
      }
    }
  };
  cca = new msal.ConfidentialClientApplication(config);
}

export function reloadMSLogin(){
  cca = null;
  return initMSLogin();
}