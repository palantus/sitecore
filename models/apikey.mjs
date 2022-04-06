import Entity, {query}  from "entitystorage"
import {getTimestamp} from "../tools/date.mjs"
import {createHash} from 'crypto'

let dailyTokensToKeyMap = new Map()
let cacheDate = null;

class APIKey extends Entity {
  initNew(name, key, user, daily = false) {
    this.name = name;
    this.issueDate = getTimestamp()
    this.key = key
    this.daily = daily||false;
    this.rel(user, "user")

    this.tag("apikey")

    cacheDate = null; //Clear cache
  }

  static tokenToKey(token){
    if(cacheDate != new Date().toISOString().substring(0, 10)) {
      dailyTokensToKeyMap.clear()
      cacheDate = new Date().toISOString().substring(0, 10);
      for(let key of query.type(APIKey).tag("apikey").prop("daily", true).all){
        dailyTokensToKeyMap.set(key.generateDailyToken(cacheDate), key)
      }
    }
    return dailyTokensToKeyMap.get(token) || APIKey.find(`tag:apikey prop:"key=${token}" !prop:daily=true`) 
  }

  generateDailyToken(date){
    if(!this.daily) return null;
    let cacheDate = date || new Date().toISOString().substring(0, 10);
    return createHash('sha256').update(this.key+cacheDate).digest('hex')
  }

  delete(){
    cacheDate = null; //Clear cache
    super.delete()
  }

  static all(){
    return APIKey.search("tag:apikey")
  }

  static lookup(id){
    return APIKey.find(`tag:apikey id:"${id}"`)
  }

  toObj() {
    return {
      text: this.text,
      timestamp: this.timestamp,
      area: this.rels.area?.map(a => ({id: a.id}))?.[0]||null
    }
  }
}

export default APIKey