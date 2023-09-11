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

  async get(path, {returnRaw = false, user = null, ignoreErrors = false, useSiteURL = false} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    let res;
    try{
      res = await fetch(`${useSiteURL ? this.siteURL : this.url}/${path}`, {
        headers: this.getHeaders(null, user)
      })
    } catch(err){
      throw err
    }
    if(!ignoreErrors && res.status !== 200){
      this.log(`Received status ${res.status} on request to remote for ${path}`)
      throw `Received status ${res.status} on request to remote for ${path}`
    }
    return returnRaw ? res : res.json()
  }
  
  async del(path, {returnRaw = false, user = null} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    let res = await fetch(`${this.url}/${path}`, {
      method: "DELETE",
      headers: this.getHeaders(null, user)
    })
    return returnRaw ? res : res.json()
  }
  
  async post(path, body, {returnRaw = false, contentType = null, user = null, isRawBody = false} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    let res = await fetch(`${this.url}/${path}`, {
      method: "POST",
      headers: this.getHeaders(contentType||"application/json", user),
      body: isRawBody ? body : JSON.stringify(body)
    })
    return returnRaw ? res : res.json()
  }
  
  async upload(path, buffer, filename, {returnRaw = false, user = null, contentType = null} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"

    const formData = new FormData()
    const file = new FetchFile([buffer], filename, { type: contentType||'application/zip' })
    formData.set('file-upload', file, filename)

    let res = await fetch(`${this.url}/${path}`, {
      method: "POST",
      headers: this.getHeaders(null, user),
      body: formData
    })
    return returnRaw ? res : res.json()
  }
  
  async patch(path, body, {returnRaw = false, user = null} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    let res =await fetch(`${this.url}/${path}`, {
      method: "PATCH",
      headers: this.getHeaders("application/json", user),
      body: JSON.stringify(body)
    })
    return returnRaw ? res : res.json()
  }
  
  async query(query, variables, {user = null} = {}){
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

  getHeaders(contentType = null, user = null){
    let ret = {'Authorization': 'Bearer ' + this.apiKey}
    if(contentType) ret['Content-Type'] = contentType
    if(user) ret['X-SiteCore-Federate'] = `${user.id}@${Setup.lookup().identifier};${user.name}`
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