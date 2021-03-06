"use strict"

import User from "../models/user.mjs"
import MSUser from "../models/msuser.mjs"
import { v4 as uuidv4 } from 'uuid';

class Service {

  static global = {};

  constructor(context) {
    this.context = context;
  }

  add(id, name, roles) {
    if (!id || !name) return null;
    let user = User.lookup(id) || new User(id, { name })
    if(roles){
      for(let role of roles){
        user.addRole(role)
      }
    }
    return user.toObj()
  }

  all() {
    return User.all().map(u => u.toObj())
  }

  active() {
    return User.active().map(u => u.toObj())
  }

  del(id) {
    let user = User.lookup(id)
    if (user)
      user.delete()
    return true;
  }

  get(id) {
    return User.lookup(id)?.toObj();
  }

  me() {
    return User.lookup(this.context.user.id);
  }

  getUnassignedMSUsers() {
    return MSUser.search("tag:msuser").filter(u => u.related.user ? false : true)
  }

  getTempAuthToken(user) {
    if (!Service.global.authTokens) Service.global.authTokens = new Map()
    let token = uuidv4()
    Service.global.authTokens.set(token, user.id)
    return token
  }

  authTokenToUserId(token) {
    if (!Service.global.authTokens) return null;
    return Service.global.authTokens.get(token) || null
  }
}

export default (context) => new Service(context)
export let service = new Service({})