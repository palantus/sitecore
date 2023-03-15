import Entity, {query}  from "entitystorage"

class Mod extends Entity {

  initNew(id) {
    if(!id) throw "id is mandatory for mods"
    this.id = id;
    this.enabled = true;
    this.tag("sitemod")
  }
  
  static lookup(id){
    return query.type(Mod).tag("sitemod").prop("id", id).first
  }

  static lookupOrCreate(id){
    return Mod.lookup(id) || new Mod(id)
  }

  static all(){
    return query.type(Mod).tag("sitemod").all
  }

  toObj(){
    return {
      id: this.id,
      enabled: this.enabled || false, 
      hasSetup: !!this.hasSetup
    }
  }
}

export default Mod