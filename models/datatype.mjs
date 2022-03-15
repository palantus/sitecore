import Entity, {query} from "entitystorage"
import Permission from "./permission.mjs";

class DataType extends Entity {
  static typeModelMap = new Map();

  initNew(id, options) {
    this.id = id;
    this.initFromOptions(options)
    this.tag("datatype")
  }

  initFromOptions({title, permission = null, api, idField = "id", nameField = "id", uiPath, showId, apiExhaustiveList, acl, aclInheritance, aclInheritFrom}){
    this.title = title;
    this.api = api || this.id;
    this.idField = idField;
    this.nameField = nameField;
    this.uiPath = uiPath || null
    this.showId = showId || false
    this.apiExhaustiveList = typeof apiExhaustiveList === "boolean" ? apiExhaustiveList : true
    this.acl = acl || null
    this.aclInheritance = !!aclInheritance
    this.rel(aclInheritFrom, "aclinheritfrom")

    this.rel(Permission.lookup(permission), "permission", true)

    return this
  }
  
  static lookup(id){
    return query.type(DataType).tag("datatype").prop("id", id).first
  }
  
  init({typeModel}){
    if(typeModel) {
      DataType.typeModelMap.set(this.id, typeModel);
      if(typeof typeModel.lookup !== "function") throw `DataType ${this.id} doesn't have a 'lookup' function`
    }
    return this;
  }
  
  static lookupOrCreate(id, options){
    return DataType.lookup(id)?.initFromOptions(options) || new DataType(id, options)
  }

  static all(){
    return DataType.search(`tag:datatype`);
  }

  get aclParent(){
    return DataType.from(this.related.aclinheritfrom)||this
  }

  lookupEntity(id){
    let TypeModel = DataType.typeModelMap.has(this.id) ? DataType.typeModelMap.get(this.id) : null;
    if(!TypeModel) throw `DataType ${this.id} didn't call init with a 'typeModel', which is necessary when using ACL/shares`
    return TypeModel.lookup(id);
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
      permission: this.related.permission?.id || null,
      acl: {
        inheritFromType: this.related.aclinheritfrom?.id || null,
        supportInheritance: !!this.aclInheritance,
        default: this.acl || null
      }
    }
  }
}

export default DataType