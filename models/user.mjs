"use strict"

import Entity, { query } from "entitystorage"
import MSUser from "./msuser.mjs"
import Notification from "./notification.mjs"
import { pbkdf2Sync } from 'crypto';
import Role from "./role.mjs";
import { clearUserRoleAndPermissionCache } from "../tools/usercache.mjs";

class User extends Entity {
  initNew(userId, { name = "", email } = {}) {
    this.id = userId
    this.name = typeof name === "string" && name.length > 0 ? name : "";
    if (email && typeof email === "string") this.email = email;
    this.tag("user")
  }

  static lookup(id) {
    if (!id) return null;
    return query.tag("user").prop("id", id).type(User).first
  }

  static lookupAdmin() {
    return User.find("tag:user role.prop:id=admin") || null
  }

  static lookupMSEmail(email) {
    return MSUser.find(`tag:msuser prop:"email=${email}"`)?.related?.user
  }

  static lookupEmail(email) {
    if(!email) return null;
    return query.tag("user").prop("email", email).first
  }

  static lookupName(name) {
    if (!name) return null;
    return query.tag("user").prop("name", name).type(User).first
  }

  static validateLocalUserId(newId) {
    if (typeof newId !== "string" || !newId) return false;
    let id = newId.replace(/[^a-zA-Z0-9\-_.]/g, '')
    if (newId !== id) return false;
    return true;
  }

  notify(area, message, details) {
    if (this.id == "guest") return;
    return new Notification(this, area, message, details)
  }

  setPassword(password) {
    if (password) {
      let salt = global.sitecore.accessTokenSecret.toString('hex');
      this.password = pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
    } else {
      this.password = null;
    }
  }

  validatePassword(possiblePassword) {
    if (!this.password || !possiblePassword) return false;
    let salt = global.sitecore.accessTokenSecret.toString('hex');
    let hash = pbkdf2Sync(possiblePassword, salt, 1000, 64, `sha512`).toString(`hex`);
    return this.password === hash
  }

  static validateEmailAddress(email) {
    if (!email || typeof email !== "string") return false;
    if (!/^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i.test(email)) return false;
    return true;
  }

  hasPassword() {
    return this.password ? true : false;
  }

  get setup() {
    let setup = this.related.setup
    if (!setup) {
      setup = new Entity()
      this.rel(setup, "setup")
    }
    return setup
  }

  get roles() {
    return this.rels.role?.map(r => r.id) || []
  }

  addRole(id) {
    this.rel(Role.lookupOrCreate(id), "role");
    clearUserRoleAndPermissionCache()
    return this;
  }

  removeRole(id) {
    this.removeRel(Role.lookup(id), "role");
    clearUserRoleAndPermissionCache()
    return this;
  }

  get permissions() {
    return [...new Set((this.rels.role?.map(r => r.rels.permission?.map(p => p.id) || []) || []).flat())]
  }

  get active() {
    return !this.tags.includes("obsolete")
  }

  deactivate() {
    this.tag("obsolete")
    return this;
  }

  activate() {
    this.removeTag("obsolete")
    return this;
  }

  static all() {
    return query.tag("user").type(User).all
  }

  static active() {
    return query.tag("user").not(query.tag("obsolete")).type(User).all
  }

  static activeByRole(roleName) {
    let role = Role.lookup(roleName)
    if (!role) return []
    return query.tag("user").not(query.tag("obsolete")).type(User).relatedTo(role, "role").all
  }

  get msUsers() {
    return query.type(MSUser).tag("msuser").relatedTo(this, "user").all
  }

  get notifications() {
    return query.type(Notification).tag("notification").relatedTo(this, "user").all
  }

  delete(){
    this.msUsers.forEach(msUser => msUser.delete());
    this.notifications.forEach(n => n.delete());
    this.related.setup?.delete();
    super.delete();
  }

  toObj() {
    return {
      id: this.id,
      name: this.name,
      msUsers: this.msUsers.map(msu => msu.toObj()),
      active: !this.tags.includes("obsolete"),
      virtual: this.tags.includes("virtual"),
      roles: this.roles
    }
  }

  toObjSimple() {
    return {
      id: this.id,
      name: this.name
    }
  }
}

export default User