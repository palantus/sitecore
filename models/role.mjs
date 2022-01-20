import Entity from "entitystorage"
import Permission from "./permission.mjs"

class Role extends Entity {

  initNew(id) {
    if(!id) throw "id is mandatory for roles"
    this.id = id
    this.tag("role")
  }

  addPermission(idOrArray){
    for(let id of Array.isArray(idOrArray) ? idOrArray : [idOrArray]){
      this.rel(Permission.lookupOrCreate(id), "permission")
    }
    return this
  }

  removePermission(id){
    this.removeRel(Permission.lookup(id), "permission")
    return this
  }

  static lookup(id){
    return Role.find(`tag:role prop:"id=${id}"`)
  }

  static lookupOrCreate(id){
    return Role.lookup(id) || new Role(id)
  }

  static all(){
    return Role.search("tag:role")
  }
}

export default Role