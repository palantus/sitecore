"use strict"

import User from "../models/user.mjs"
import MSUser from "../models/msuser.mjs"
import { v4 as uuidv4 } from 'uuid';

class Service{

    static global = {};

    constructor(context){
      this.context = context;
    }

    add(id, name){
        return User.lookup(id)?.toObj() || new User(id, {name}).toObj()
    }

    all(){
        return User.search("tag:user").map(u => u.toObj())
    }

    active(){
        return User.search("tag:user !tag:obsolete").map(u => u.toObj())
    }

    del(id){
        let user = User.lookup(id)
        if(user)
            user.delete()
        return true;
    }

    get(id){
        return User.lookup(id)?.toObj();
    }

    me(){
      return User.lookup(this.context.user.id);
    }

    getUnassignedMSUsers(){
        return MSUser.search("tag:msuser").filter(u => u.related.user ? false : true)
    }

    assignToMSAccount(id, msid){
        let msUser = MSUser.lookup(msid)
        if(msUser){
            if(msUser.related.user && msUser.related.user.id != id){
                return "MS user is already assigned to another user"
            } else {
                let user = User.lookup(id)
                if(user){
                    msUser.rel(user, "user")
                    return true;
                } else {
                    return "Local user doesn't exist"
                }
            }
        } else {
            return "MS user doesn't exist. Try logging in with it first."
        }
    }
    
    getTempAuthToken(user){
      if(!Service.global.authTokens) Service.global.authTokens = new Map()
      let token = uuidv4()
      Service.global.authTokens.set(token, user.id)
      return token
    }

    authTokenToUserId(token){
      if(!Service.global.authTokens) return null;
      return Service.global.authTokens.get(token) || null
    }
}

export default (context) => new Service(context)
export let service = new Service({})