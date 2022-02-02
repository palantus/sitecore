import Entity from "entitystorage"
import Permission from "./permission.mjs";

class DataType extends Entity {
  initNew(id, {title, permission = null, api, idField = "id", nameField = "id"}) {
    this.id = id;
    this.title = title;
    this.api = api || id;
    this.idField = idField;
    this.nameField = nameField;
    
    this.rel(Permission.lookup(permission), "permission")
    this.tag("datatype")
  }
  
  static lookup(id){
    return DataType.find(`tag:datatype prop:"id=${id}"`)
  }
  
  static lookupOrCreate(id, options){
    return DataType.lookup(id) || new DataType(id, options)
  }

  static all(){
    return DataType.search(`tag:datatype`);
  }

  toObj() {
    return {
      id: this.id,
      title: this.title,
      api: {
        path: this.api,
        fields: {
          id: this.idField,
          name: this.nameField
        }
      },
      permission: this.related.permission?.id || null
    }
  }
}

export default DataType