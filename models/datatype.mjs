import Entity from "entitystorage"
import Permission from "./permission.mjs";

class DataType extends Entity {
  initNew(id, {title, permission = null, api, idField = "id", nameField = "id", uiPath, showId, apiExhaustiveList}) {
    this.id = id;
    this.title = title;
    this.api = api || id;
    this.idField = idField;
    this.nameField = nameField;
    this.uiPath = uiPath || null
    this.showId = showId || false
    this.apiExhaustiveList = typeof apiExhaustiveList === "boolean" ? apiExhaustiveList : true
    
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
        },
        exhaustiveList: this.apiExhaustiveList === false ? false : true
      },
      ui: {
        path: this.uiPath || null,
        showId: this.showId || false
      },
      permission: this.related.permission?.id || null
    }
  }
}

export default DataType