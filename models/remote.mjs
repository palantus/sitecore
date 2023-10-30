import Entity, {query, nextNum} from "entitystorage"
import fetch, {FormData, File as FetchFile} from "node-fetch"
import LogEntry from './logentry.mjs'
import Setup from "./setup.mjs"

export default class Remote extends Entity {
  initNew({title, apiKey, url} = {}) {
    this.id = nextNum("remote")
    this.title = title || "New Remote"
    this.url = url || null
    this.apiKey = apiKey || null
    this.tag("remote")
  }

  static lookup(id){
    if(!id) return null;
    return query.type(Remote).tag("remote").prop("id", id).first
  }

  static lookupIdentifier(identifier){
    if(!identifier) return null;
    return query.type(Remote).tag("remote").prop("identifier", identifier).first
  }

  static all(){
    return query.type(Remote).tag("remote").all
  }

  static allWithMod(mod){
    return query.type(Remote).tag("remote").all.filter(remote => {
      if(!remote.identity) return false;
      try{
        return JSON.parse(remote.identity).mods.includes(mod)
      } catch(err){}
      return false;
    })
  }

  async get(path, {returnRaw = false, user = null, ignoreErrors = false, useSiteURL = false, useGuest = false, customHeaders = {}} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    if(useSiteURL && !this.siteURL) throw `Site URL must be defined for Remote ${this.title}`;
    let res;
    try{
      res = await fetch(`${useSiteURL ? this.siteURL : this.url}/${path}`, {
        headers: {...this.getHeaders(null, user, useGuest), ...customHeaders}
      })
    } catch(err){
      throw err
    }
    if(!ignoreErrors && res.status !== 200){
      this.log(`Received status ${res.status} (${res.statusText}) on GET to remote  ${this.title} for ${path}`)
      throw `Received status ${res.status} (${res.statusText}) on GET to remote ${this.title}  for ${path}`
    }
    return returnRaw ? res : res.json()
  }
  
  async del(path, {returnRaw = false, user = null, useGuest = false} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    let res = await fetch(`${this.url}/${path}`, {
      method: "DELETE",
      headers: this.getHeaders(null, user, useGuest)
    })
    return returnRaw ? res : res.json()
  }
  
  async post(path, body, {returnRaw = false, contentType = null, user = null, isRawBody = false, useGuest = false} = {}, ignoreErrors = false){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    let res;
    try{
      res = await fetch(`${this.url}/${path}`, {
        method: "POST",
        headers: this.getHeaders(contentType||"application/json", user, useGuest),
        body: isRawBody ? body : JSON.stringify(body)
      })
    } catch(err){
      throw err
    }
    if(!ignoreErrors && res.status !== 200){
      this.log(`Received status ${res.status} (${res.statusText}) on POST to remote ${this.title} for ${path}`)
      throw `Received status ${res.status} (${res.statusText}) on POST to remote ${this.title}  for ${path}`
    }
    return returnRaw ? res : res.json()
  }
  
  async upload(path, buffer, filename, {returnRaw = false, user = null, contentType = null, useGuest = false} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"

    const formData = new FormData()
    const file = new FetchFile([buffer], filename, { type: contentType||'application/zip' })
    formData.set('file-upload', file, filename)

    let res = await fetch(`${this.url}/${path}`, {
      method: "POST",
      headers: this.getHeaders(null, user, useGuest),
      body: formData
    })
    return returnRaw ? res : res.json()
  }
  
  async patch(path, body, {returnRaw = false, user = null, useGuest = false} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    let res =await fetch(`${this.url}/${path}`, {
      method: "PATCH",
      headers: this.getHeaders("application/json", user, useGuest),
      body: JSON.stringify(body)
    })
    return returnRaw ? res : res.json()
  }
  
  async query(query, variables, {user = null, useGuest = false} = {}){
    let res = await this.post(`graphql`, {query, variables, user})
    return res.data || res
  }

  static async testConfig({url, apiKey}){
    if(!url || !apiKey) return {success: false, error: "Missing url or apiKey"}
    try{
      let res = await fetch(`${url}/me`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${''}:${apiKey}`, 'binary').toString('base64')
        }
      })
      if(res.status !== 200){
        return {success: false, error: `Got status code ${res.status} (${res.statusText})`}
      } else {
        return {success: true, user: await res.json()}
      }
    } catch(error){
      return {success: false, error: `${error}`}
    }
  }

  getHeaders(contentType = null, user = null, useGuest = false){
    let ret = {}
    if(!useGuest) ret['Authorization'] = 'Bearer ' + this.apiKey
    if(contentType) ret['Content-Type'] = contentType
    if(user && !useGuest) {
      if(user.id.includes("@"))
        ret['X-SiteCore-Federate'] = `${user.id.split("@")[0]}@${Setup.lookup().identifier};${user.name}`
      else
        ret['X-SiteCore-Federate'] = `${user.id}@${Setup.lookup().identifier};${user.name}`
    }
    if(/federation\/[a-zA-Z0-9-_]+\/api/.test(this.url)) ret['x-forward-auth'] = "yes";
    return ret;
  }

  async refresh(){
    try{
      let identity = await this.get("system/identity")
      this.identifier = identity.identifier||null;
      this.siteURL = identity.site;
      this.identity = JSON.stringify(identity)
      return true;
    } catch(err){
      console.log(err)
    }
    return false;
  }

  log(text){
    return new LogEntry(text, "federation")
  }

  toObj() {
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      siteURL: this.siteURL || null,
      apiKey: this.apiKey,
      identifier: this.identifier,
      identity: this.identity
    }
  }

}