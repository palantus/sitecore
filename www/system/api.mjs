import { alertDialog } from "../components/dialog.mjs"
import { state, apiURL, isSinglePageMode, goto, removeQueryVar } from "./core.mjs"
import { on, fire } from "./events.mjs"
import messageServer from "./message.mjs"

class API {
  cache = new Map()

  constructor() {
    this.setToken()
    on("changed-project", "api", () => {
      this.failedLoginState = false;
      this.setToken()
    })
  }

  setToken() {
    let urlToken = state().query.token
    let tokenKey = `apitoken`
    if (urlToken) {
      this.token = urlToken;
      localStorage.setItem(tokenKey, this.token)
      localStorage.removeItem("userroles")
      removeQueryVar("token");
    } else {
      this.token = localStorage.getItem(tokenKey)
    }

    if (this.token) {
      this.failedLoginState = false;
      this.tokenPayload = parseJwt(this.token)
      if (!isSinglePageMode()) {
        messageServer.connect();
      }
    } else {
      if (state().query.success == "false") {
        alertDialog("Could not sign in")
        this.failedLoginState = true;
      } else {
        this.login();
      }
    }

  }

  removeToken(){
    localStorage.removeItem("apitoken")
    localStorage.removeItem("userroles")
    delete this.token;
  }

  lookupCache(path){
    let url = `${apiURL()}/${path}`;
    if (this.cache && this.cache.has(url))
      return this.cache.get(url)
    return null;
  }

  async get(path, { returnIfError = false, cache = false } = {}) {
    if (this.failedLoginState === true) return;
    let url = `${apiURL()}/${path}`;

    if (cache && this.cache.has(url))
      return this.cache.get(url)

    let res = await fetch(url, {
      headers: this.getHeaders(false)
    })
    if (res.status < 300 || returnIfError === true) {
      let jsonResult = await res.json();
      this.cache.set(url, jsonResult)
      return jsonResult;
    } else if (res.status == 401) {
      this.login()
    } else if (res.status >= 400 && res.status < 500) {
      let retObj = await res.json()
      console.log(`${res.status}: ${res.statusText}`, retObj)
      fire("log", { level: "error", message: retObj.message || retObj.error })
      throw retObj.message || retObj.error
    } else {
      toast(`Request returned an error. Information: ${res.status}; ${res.statusText}`)
    }
  }

  async post(path, data) {
    if (this.failedLoginState === true) return;
    let res = await fetch(`${apiURL()}/${path}`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: this.getHeaders(true)
    })
    if (res.status < 300) {
      return await res.json();
    } else if (res.status == 401) {
      this.login()
    } else if (res.status >= 400/* && res.status < 500*/) {
      let retObj = await res.json()
      console.log(`${res.status}: ${res.statusText}`, retObj)
      fire("log", { level: "error", message: retObj.message || retObj.error })
      throw retObj.message || retObj.error
    }
  }

  async upload(path, formData) {
    if (this.failedLoginState === true) return;
    let res = await fetch(`${apiURL()}/${path}`, {
      method: "POST",
      body: formData,
      headers: this.getHeaders(false)
    })
    if (res.status < 300) {
      return await res.json();
    } else if (res.status == 401) {
      this.login()
    } else if (res.status >= 400/* && res.status < 500*/) {
      let retObj = await res.json()
      console.log(`${res.status}: ${res.statusText}`, retObj)
      fire("log", { level: "error", message: retObj.message || retObj.error })
      throw retObj.message || retObj.error
    }
  }

  async patch(path, data) {
    if (this.failedLoginState === true) return;
    let res = await fetch(`${apiURL()}/${path}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: this.getHeaders(true)
    })
    if (res.status < 300) {
      return await res.json();
    } else if (res.status == 401) {
      this.login()
    } else if (res.status >= 400/* && res.status < 500*/) {
      let retObj = await res.json()
      console.log(`${res.status}: ${res.statusText}`, retObj)
      fire("log", { level: "error", message: retObj.message || retObj.error })
      throw retObj.message || retObj.error
    }
  }

  async del(path) {
    if (this.failedLoginState === true) return;
    let res = await fetch(`${apiURL()}/${path}`,
      {
        method: "DELETE",
        headers: this.getHeaders(false)
      })
    if (res.status < 300) {
      return await res.json();
    } else if (res.status == 401) {
      this.login()
    } else if (res.status >= 400/* && res.status < 500*/) {
      let retObj = await res.json()
      console.log(`${res.status}: ${res.statusText}`, retObj)
      fire("log", { level: "error", message: retObj.message || retObj.error })
      throw retObj.message || retObj.error
    }
  }

  async query(query, variables) {
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
      if (res.data)
        return res.data
      else
        return res;
    } else if (res.status == 401) {
      this.login()
    } else if (res.status == 400) {
      console.log(await res.json())
    } else {
      console.log(`${res.status}: ${res.statusText}`)
    }
  }

  login() {
    if (window.location.pathname.startsWith("/login")) return;
    let redirectUrl = window.location.pathname;
    goto(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
  }

  logout(){
    this.removeToken();
    this.cache = new Map()
  }

  async fetch(path, options) {
    if (this.failedLoginState === true) return;
    let parms = options || {}
    parms.headers = this.getHeaders(true)
    let res = await fetch(`${apiURL()}/${path}`, parms)
    if (res.status < 300 || parms.returnIfError === true) {
      return res;
    } else if (res.status == 401) {
      this.login()
    } else if (res.status >= 400 && res.status < 500) {
      alertDialog("Server fejl")
      console.log(await res.text())
    } else {
      toast(`Request returned an error. Information: ${res.status}; ${res.statusText}`)
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

function parseJwt(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
};

export let api = new API()

export default api
export function getToken() { return api.token }
export function getUser() { return api.tokenPayload }
export function getApiUrl() { return `${apiURL()}` }
export function userRolesCached() {
  let storedRoles = window.localStorage.getItem("userroles")
  return storedRoles ? JSON.parse(storedRoles) : []
}
export async function userRoles() {
  let me = api.lookupCache("me");
  if(!me){
    let storedRoles = window.localStorage.getItem("userroles")
    if(storedRoles) {
      // Make sure to update cache, in case the roles change
      api.get("me").then(me => {
        let roles = me?.roles || []
        window.localStorage.setItem("userroles", JSON.stringify(roles))
      })
      return JSON.parse(storedRoles)
    }

    me = await api.get("me")
  }
  let roles = me?.roles || []
  window.localStorage.setItem("userroles", JSON.stringify(roles))
  return roles;
}