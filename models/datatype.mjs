import Entity from "entitystorage"
import Permission from "./permission.mjs";

class DataType extends Entity {
  initNew(id, options) {
    this.id = id;
    this.initFromOptions(options)
    this.tag("datatype")
  }

  initFromOptions({title, permission = null, api, idField = "id", nameField = "id", uiPath, showId, apiExhaustiveList, query, acl}){
    this.title = title;
    this.api = api || this.id;
    this.idField = idField;
    this.nameField = nameField;
    this.uiPath = uiPath || null
    this.showId = showId || false
    this.apiExhaustiveList = typeof apiExhaustiveList === "boolean" ? apiExhaustiveList : true
    this.query = query || null
    this.acl = acl || null
    
    this.rel(Permission.lookup(permission), "permission", true)

    return this
  }
  
  static lookup(id){
    return DataType.find(`tag:datatype prop:"id=${id}"`)
  }
  
  static lookupOrCreate(id, options){
    return DataType.lookup(id)?.initFromOptions(options) || new DataType(id, options)
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