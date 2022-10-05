import Entity, {query}  from "entitystorage"
import { clearUserRoleAndPermissionCache } from "../tools/usercache.mjs"
import Permission from "./permission.mjs"
import User from "./user.mjs"

class Role extends Entity {

  initNew(id) {
    if(!id) throw "id is mandatory for roles"
    this.id = id
    this.tag("role")
  }

  addPermission(idOrArray, createIfMissing = false){
    for(let id of Array.isArray(idOrArray) ? idOrArray : [idOrArray]){
      this.rel(createIfMissing ? Permission.lookupOrCreate(id) : Permission.lookup(id), "permission")
    }
    clearUserRoleAndPermissionCache()
    return this
  }

  removePermission(id){
    this.removeRel(Permission.lookup(id), "permission")
    clearUserRoleAndPermissionCache()
    return this
  }

  get members(){
    return this.relsrev.role?.filter(u => u.tags.includes("user")).map(u => User.from(u)).filter(u => u.active)||[]
  }

  static lookup(id){
    return query.type(Role).tag("role").prop("id", id).first
  }

  static lookupOrCreate(id){
    return Role.lookup(id) || new Role(id)
  }

  static all(){
    return query.type(Role).tag("role").all
  }
}

export default Role