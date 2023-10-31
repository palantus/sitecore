import Entity, {query}  from "entitystorage"
import {getTimestamp} from "../tools/date.mjs"
import {createHash} from 'crypto'
import Role from "./role.mjs";
import User from "./user.mjs";

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
    if(dailyTokensToKeyMap.has(token))
      return dailyTokensToKeyMap.get(token)
      
    let key = APIKey.lookupKey(token);
    if(key && !key.daily)
      return key

    return null;
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
    return query.type(APIKey).tag("apikey").all
  }

  static lookup(id){
    if(!id) return null;
    return query.type(APIKey).tag("apikey").id(id).first
  }

  static lookupKey(key){
    if(!key) return null;
    return query.type(APIKey).tag("apikey").prop("key", key).first
  }

  static lookupIdentifier(identifier){
    if(!identifier) return null;
    return query.type(APIKey).tag("apikey").prop("identifier", identifier).first
  }

  get roles(){
    return this.rels.role?.map(r => Role.from(r))||[]
  }

  getUser(federateUser){
    let keyUser = User.from(this.related.user);
    if(!federateUser) return keyUser;
    if(!this.federation) return null;
    if(!this.identifier) return null;
    let [federateUserId, name] = federateUser.split(";")
    let userIdSplit = federateUserId.split("@");
    if(userIdSplit.length < 2) return null;
    let identifier = userIdSplit.pop();
    if(this.identifier != identifier) return null;
    let user = User.lookup(federateUserId)
    if(!user){
      user = new User(federateUserId, {name})
      user.tag("federated")
      for(let role of this.roles){
        user.addRole(role.id)
      }
    }
    return user;
  }

  toObj() {
    return {
      id: this._id,
      name: this.name,
      userId: this.related.user?.id||null,
      issueDate: this.issueDate,
      daily: this.daily||false,
      roles: this.roles.map(r => r.toObj()),
      federation: !!this.federation,
      identifier: this.identifier||null
    }
  }
}

export default APIKey