import Entity, {query} from "entitystorage"
import LogEntry from "./logentry.mjs";

export default class LogArea extends Entity {
  initNew(name) {
    this.id = name
    this.tag("logarea")
  }

  static lookup(areaName){
    return query.type(LogArea).tag("logarea").prop("id", areaName).first
  }

  static lookupOrCreate(areaName){
    if(!areaName) return null;
    return query.type(LogArea).tag("logarea").prop("id", areaName).first || new LogArea(areaName)
  }

  static all(){
    return query.type(LogArea).tag("logarea").all
  }

  get entries(){
    return query.type(LogEntry).tag("logentry").relatedTo(this, "area").all
  }

  toObj() {
    return {
      id: this.id
    }
  }

}