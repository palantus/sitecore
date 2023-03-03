"use strict"

import Entity, { query } from "entitystorage"
import MSUser from "./msuser.mjs"
import Notification from "./notification.mjs"
import { pbkdf2Sync } from 'crypto';
import Role from "./role.mjs";
import { clearUserRoleAndPermissionCache } from "../tools/usercache.mjs";
import ACL from "./acl.mjs";
import Permission from "./permission.mjs";
import { uuidv4 } from "../www/libs/uuid.mjs";
import Setup from "./setup.mjs"

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
    return query.type(User).tag("user").prop("email", email).first
  }

  static lookupName(name) {
    if (!name) return null;
    return query.tag("user").prop("name", name).type(User).first
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

  static activeByPermission(permissionId){
    if(!permissionId) return [];
    let permission = Permission.lookup(permissionId)
    if(!permission) return [];
    return query.type(User).tag("user").not(query.tag("obsolete")).relatedTo(query.tag("role").relatedTo(permission, "permission"), "role").all
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

  resetPassword(){
    let newPassword = uuidv4()
    this.setPassword(newPassword);
    if(this.email && global.mods.find(m => m.id == "mail")) {
      import("../mods/mail/models/mail.mjs").catch(() => null)
                                            .then(({default: Mail}) => {
        this.setPassword(newPassword)
        new Mail({
          to: this.email, 
          subject: `${Setup.lookup().siteTitle}: Password reset`, 
          body: `<h1>Hi ${this.name}!</h1><p>Here is your new password:</p><div>${newPassword}</div><br>You can change your new password to something of your choice <a href="${global.sitecore.siteURL}/profile">here</a>.<br>If you just want to go to the site and log in, follow <a href="${global.sitecore.siteURL}/login">this link</a>.`,
          bodyType: "html"
        }).send()
      })
    }
    return newPassword
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

  hasPermission(permission) {
    return (this.rels.role?.map(r => r.rels.permission?.map(p => p.id) || []) || []).flat().includes(permission)
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
    ACL.getAllUserDefaults(this).forEach(def => def.delete())
    super.delete();
  }

  toObj() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
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