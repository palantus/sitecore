import Entity, {query} from "entitystorage"
import {getTimestamp} from "../tools/date.mjs"
import LogArea from "./logarea.mjs";

class LogEntry extends Entity {
  initNew(text, areaName = null) {
    let area = LogArea.lookupOrCreate(areaName)
    
    this.text = text;
    this.timestamp = getTimestamp()
    this.rel(area, "area")
    this.tag("logentry")
  }

  toObj() {
    return {
      text: this.text,
      timestamp: this.timestamp,
      area: this.area?.toObj()||null
    }
  }

  get area(){
    return LogArea.from(this.related.area)
  }

  static all(){
    return query.type(LogEntry).tag("logentry").all
  }

  static create(text, areaName = null){
    return new LogEntry(text, areaName||null)
  }
}

export default LogEntry