import Entity, {query} from "entitystorage"

class Permission extends Entity {

  initNew(id) {
    if(!id) throw "id is mandatory for permissions"
    this.id = id
    this.tag("permission")
  }

  static lookup(id){
    if(!id) return null;
    return query.type(Permission).tag("permission").prop("id", id).first
  }

  static lookupOrCreate(id){
    return Permission.lookup(id) || new Permission(id)
  }

  static all(){
    return query.type(Permission).tag("permission").all
  }
}

export default Permission