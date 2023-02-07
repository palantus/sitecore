import Entity, {query, nextNum} from "entitystorage"
import fetch, {FormData, File as FetchFile} from "node-fetch"
import LogEntry from './logentry.mjs'

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

  static all(){
    return query.type(Remote).tag("remote").all
  }

  async get(path, {returnRaw = false} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    let res;
    try{
      res = await fetch(`${this.url}/${path}`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${''}:${this.apiKey}`, 'binary').toString('base64')
        }
      })
    } catch(err){
      throw err
    }
    if(res.status !== 200){
      this.log(`Received status ${res.status} on request to remote for ${path}`)
      throw `Received status ${res.status} on request to remote for ${path}`
    } else
      return returnRaw ? res : res.json()
  }
  
  async del(path){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    return (await fetch(`${this.url}/${path}`, {
      method: "DELETE",
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${''}:${this.apiKey}`, 'binary').toString('base64')
      }
    })).json()
  }
  
  async post(path, body, {returnRaw = false, contentType = null, isRawBody = false} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    let res = await fetch(`${this.url}/${path}`, {
      method: "POST",
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${''}:${this.apiKey}`, 'binary').toString('base64'),
        'Content-Type' : contentType||"application/json"
      },
      body: isRawBody ? body : JSON.stringify(body)
    })
    return returnRaw ? res : res.json()
  }
  
  async upload(path, buffer, filename, {returnRaw = false, contentType = null} = {}){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"

    const formData = new FormData()
    const file = new FetchFile([buffer], filename, { type: contentType||'application/zip' })
    formData.set('file-upload', file, filename)

    let res = await fetch(`${this.url}/${path}`, {
      method: "POST",
      headers: {
        'Authorization': 'Bearer ' + this.apiKey
      },
      body: formData
    })
    return returnRaw ? res : res.json()
  }
  
  async patch(path, body){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    return (await fetch(`${this.url}/${path}`, {
      method: "PATCH",
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${''}:${this.apiKey}`, 'binary').toString('base64'),
        'Content-Type' : "application/json"
      },
      body: JSON.stringify(body)
    })).json()
  }
  
  async query(query, variables){
    let res = await this.post(`graphql`, {query, variables})
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

  async refresh(){
    try{
      let identity = await this.get("system/identity")
      this.identifier = identity.identifier||null;
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
      apiKey: this.apiKey,
      identifier: this.identifier,
      identity: this.identity
    }
  }

}