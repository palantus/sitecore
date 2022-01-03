import Entity from "entitystorage"
import {getTimestamp} from "../tools/date.mjs"

class LogEntry extends Entity {
  initNew(text, areaName = null) {
    let area = areaName ? Entity.find(`tag:logarea prop:"id=${areaName}"`) : null
    if (!area && areaName) {
      area = new Entity().tag("logarea").prop("id", areaName)
    }
    
    this.text = text;
    this.timestamp = getTimestamp()
    this.rel(area, "area")
    this.tag("logentry")
  }

  toObj() {
    return {
      text: this.text,
      timestamp: this.timestamp,
      area: this.rels.area?.map(a => ({id: a.id}))?.[0]||null
    }
  }
}

export default LogEntry