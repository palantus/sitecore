import Entity from "entitystorage"

class Permission extends Entity {

  initNew(id) {
    if(!id) throw "id is mandatory for permissions"
    this.id = id
    this.tag("permission")
  }

  static lookup(id){
    if(!id) return null;
    return Permission.find(`tag:permission prop:"id=${id}"`)
  }

  static lookupOrCreate(id){
    return Permission.lookup(id) || new Permission(id)
  }

  static all(){
    return Permission.search("tag:permission")
  }
}

export default Permission