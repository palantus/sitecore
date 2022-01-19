import Entity from "entitystorage"

class Role extends Entity {

  initNew(id) {
    if(!id) throw "id is mandatory for roles"
    this.id = id
    this.tag("role")
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