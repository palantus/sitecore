import Entity, {query, nextNum} from "entitystorage"
import fetch from "node-fetch"
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

  async get(path){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    let res = await fetch(`${this.url}/${path}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${''}:${this.apiKey}`, 'binary').toString('base64')
      }
    })
    if(res.status !== 200){
      log(`Received status ${res.status} on request to portal for ${path}`)
      throw `Received status ${res.status} on request to portal for ${path}`
    } else
      return res.json()
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
  
  async post(path, body){
    if(!this.url || !this.apiKey) throw "apiKey and url must be provided"
    return (await fetch(`${this.url}/${path}`, {
      method: "POST",
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${''}:${this.apiKey}`, 'binary').toString('base64'),
        'Content-Type' : "application/json"
      },
      body: JSON.stringify(body)
    })).json()
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

  log(text){
    return new LogEntry(text, "federation")
  }

  toObj() {
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      apiKey: this.apiKey
    }
  }

}