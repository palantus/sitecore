"use strict"

import Entity from "entitystorage"
import MSUser from "./msuser.mjs"
import Notification from "./notification.mjs"
import {pbkdf2Sync} from 'crypto'; 

class User extends Entity{
    initNew(userId, {name = ""} = {}){
        this.id = userId
        this.name = typeof name === "string" && name.length > 0 ? name : "";
        this.tag("user")
    }

    static lookup(id){
      if(!id) return null;
      return User.find(`tag:user prop:"id=${id}"`)
    }

    static lookupAdmin(){
      return User.find("tag:user tag:admin") || null
    }

    static lookupEmail(email){
        return MSUser.find(`tag:msuser prop:"email=${email}"`)?.related?.user
    }

    notify(area, message, details){
      new Notification(this, area, message, details)
    }

    setPassword(password){
      if(password){
        let salt = (process.env.ACCESS_TOKEN_SECRET||"123").toString('hex'); 
        this.password = pbkdf2Sync(password, salt,  1000, 64, `sha512`).toString(`hex`);
      } else {
        this.password = null;
      }
    }

    validatePassword(possiblePassword){
      if(!this.password || !possiblePassword) return false;
      let salt = (process.env.ACCESS_TOKEN_SECRET||"123").toString('hex'); 
      let hash = pbkdf2Sync(possiblePassword,  salt, 1000, 64, `sha512`).toString(`hex`);
      return this.password === hash
    }

    hasPassword(){
      return this.password ? true : false;
    }

    get setup(){
      let setup = this.related.setup
      if(!setup){
        setup = new Entity()
        this.rel(setup, "setup")
      }
      return setup
    }

    get roles(){
      return this.tags.filter(t => ["translator", "admin", "developer", "tester", "team"].includes(t))
      //return this.rels.role?.map(r => r.id)||[]
    }

    get active(){
      return !this.tags.includes("obsolete")
    }

    deactivate(){
      this.tag("obsolete")
      return this;
    }

    activate(){
      this.removeTag("obsolete")
      return this;
    }

    toObj(){
        return {
            id: this.id,
            name: this.name,
            msUsers: MSUser.search(`tag:msuser rel:${this}=user`).map(msu => msu.toObj()),
            active: !this.tags.includes("obsolete"),
            virtual: this.tags.includes("virtual"),
        }
    }
}

export default User