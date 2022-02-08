import { alertDialog } from "../components/dialog.mjs"
import { state, apiURL, isSinglePageMode, removeQueryVar } from "./core.mjs"
import { on, fire } from "./events.mjs"
import messageServer from "./message.mjs"

class API {
  cache = new Map()
  activeCacheableRequests = {}

  checkInit(){
    if(!this.isInitialized)
      this.setToken()
    this.isInitialized = true;
  }

  setToken(newToken) {
    if(newToken){
      this.token = newToken
    }
    
    if(!this.token){
      let urlToken = state().query.token
      if (urlToken) {
        this.token = urlToken;
        removeQueryVar("token");
      }
    }

    if(!this.token){
      this.token = localStorage.getItem('apitoken')
    }

    if(this.token){
      localStorage.setItem('apitoken', this.token)

      this.failedLoginState = false;
      if (!isSinglePageMode()) {
        messageServer.connect();
      }
    } else {
      if (state().query.success == "false") {
        alertDialog("Could not sign in")
        this.failedLoginState = true;
      } else {
        //this.notLoggedIn();
      }
    }

  }

  removeToken(){
    localStorage.removeItem("apitoken")
    localStorage.removeItem("userroles")
    localStorage.removeItem("userpermissions")
    delete this.token;
  }

  hasToken(){
    this.checkInit()
    return !!this.token
  }

  lookupCache(path){
    this.checkInit();
    let url = `${apiURL()}/${path}`;
    if (this.cache && this.cache.has(url)){
      let cachedResult = this.cache.get(url)
      return (cachedResult instanceof Promise) ? null : cachedResult.result
    }
    return null;
  }

  async get(path, { returnIfError = false, cache = false, maxAge } = {}) {
    this.checkInit();
    if (this.failedLoginState === true) return;
    let url = `${apiURL()}/${path}`;
    
    if (cache && this.cache.has(url)){
      let cachedResult = this.cache.get(url)
      while(cachedResult instanceof Promise){
        await cachedResult
        cachedResult = this.cache.get(url)
      }
      if(!maxAge || new Date().getTime() - cachedResult.ts <= maxAge)
        return cachedResult.result;
    }
    
    let requestPromise = new Promise(async (resolve, reject) => {
      let res;
      try{
        res = await fetch(url, {headers: this.getHeaders(false)})
      } catch(err){
        fire("log", { level: "error", message: `Request returned an error. Information: ${err}`})
        reject();
        return;
      }

      if (res.status < 300 || returnIfError === true) {
        let jsonResult = await res.json();
        this.cache.set(url, {result: jsonResult, ts: new Date().getTime()})
        resolve(jsonResult);
        return jsonResult;
      } else if (res.status == 401) {
        //this.notLoggedIn()
        reject();
      } else if (res.status >= 400 && res.status < 500) {
        let retObj = await res.json()
        console.log(`${res.status}: ${res.statusText}`, retObj)
        fire("log", { level: "error", message: retObj.message || retObj.error })
        reject();
        throw retObj.message || retObj.error
      } else {
        fire("log", { level: "error", message: `Request returned an error. Information: ${res.status}; ${res.statusText}`})
        reject();
      }
    })
    this.cache.set(url, requestPromise);

    return requestPromise;
  }

  async post(path, data) {
    this.checkInit();
    if (this.failedLoginState === true) return;
    let res = await fetch(`${apiURL()}/${path}`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: this.getHeaders(true)
    })
    if (res.status < 300) {
      return await res.json();
    } else if (res.status == 401) {
      //this.notLoggedIn()
    } else if (res.status >= 400/* && res.status < 500*/) {
      let retObj = await res.json()
      console.log(`${res.status}: ${res.statusText}`, retObj)
      fire("log", { level: "error", message: retObj.message || retObj.error })
      throw retObj.message || retObj.error
    }
  }

  async upload(path, formData) {
    this.checkInit();
    if (this.failedLoginState === true) return;
    let res = await fetch(`${apiURL()}/${path}`, {
      method: "POST",
      body: formData,
      headers: this.getHeaders(false)
    })
    if (res.status < 300) {
      return await res.json();
    } else if (res.status == 401) {
      //this.notLoggedIn()
    } else if (res.status >= 400/* && res.status < 500*/) {
      let retObj = await res.json()
      console.log(`${res.status}: ${res.statusText}`, retObj)
      fire("log", { level: "error", message: retObj.message || retObj.error })
      throw retObj.message || retObj.error
    }
  }

  async patch(path, data) {
    this.checkInit();
    if (this.failedLoginState === true) return;
    let res = await fetch(`${apiURL()}/${path}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: this.getHeaders(true)
    })
    if (res.status < 300) {
      return await res.json();
    } else if (res.status == 401) {
      //this.notLoggedIn()
    } else if (res.status >= 400/* && res.status < 500*/) {
      let retObj = await res.json()
      console.log(`${res.status}: ${res.statusText}`, retObj)
      fire("log", { level: "error", message: retObj.message || retObj.error })
      throw retObj.message || retObj.error
    }
  }

  async del(path) {
    this.checkInit();
    if (this.failedLoginState === true) return;
    let res = await fetch(`${apiURL()}/${path}`,
      {
        method: "DELETE",
        headers: this.getHeaders(false)
      })
    if (res.status < 300) {
      return await res.json();
    } else if (res.status == 401) {
      //this.notLoggedIn()
    } else if (res.status >= 400/* && res.status < 500*/) {
      let retObj = await res.json()
      console.log(`${res.status}: ${res.statusText}`, retObj)
      fire("log", { level: "error", message: retObj.message || retObj.error })
      throw retObj.message || retObj.error
    }
  }

  async query(query, variables) {
    this.checkInit();
    if (this.failedLoginState === true) return;
    let res = await fetch(`${apiURL()}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        query: query,
        variables: variables
      })
    })

    /*
    // Changed to GET request to help service worker cache result
    let url = `https://${state().project}/graphql?query=${encodeURI(query)}&variables=${variables?encodeURI(JSON.stringify(variables)):""}`
    let res = await fetch(url, {
        headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        }
    })
    */
    if (res.status < 300) {
      res = await res.json()
      if(res.errors){
        fire("log", { level: "error", message: res.errors[0]?.message })
      }
      if (res.data)
        return res.data
      else
        return res;
    } else if (res.status == 401) {
      //this.notLoggedIn()
    } else if (res.status == 400) {
      console.log(await res.json())
    } else {
      console.log(`${res.status}: ${res.statusText}`)
    }
  }

  /*
  notLoggedIn(){
    throw "Not signed in"
  }
  */

  logout(){
    this.checkInit();
    this.removeToken();
    this.cache = new Map()
  }

  async fetch(path, options) {
    this.checkInit();
    if (this.failedLoginState === true) return;
    let parms = options || {}
    parms.headers = this.getHeaders(true)
    let res = await fetch(`${apiURL()}/${path}`, parms)
    if (res.status < 300 || parms.returnIfError === true) {
      return res;
    } else if (res.status == 401) {
      //this.notLoggedIn()
    } else if (res.status >= 400 && res.status < 500) {
      alertDialog("Server fejl")
      console.log(await res.text())
    } else {
      fire("log", { level: "error", message: `Request returned an error. Information: ${res.status}; ${res.statusText}`})
    }
  }

  getHeaders(hasContent) {
    let headers = {
      "Authorization": "Bearer " + this.token
    }
    if (hasContent) headers["Content-Type"] = "application/json"
    if (state().impersonate) headers["impersonate-user"] = state().impersonate
    return headers;
  }
}

/*
function parseJwt(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
};
*/

export let api = new API()
export default api