import Entity, { query } from "entitystorage"
import { getTimestamp } from "../tools/date.mjs"
import LogArea from "./logarea.mjs";
import User from "./user.mjs";

class LogEntry extends Entity {
  initNew(text, areaName = null, { user } = {}) {
    let area = LogArea.lookupOrCreate(areaName)

    this.text = text;
    this.timestamp = getTimestamp()
    this.rel(area, "area")
    this.rel(user, "user")
    this.tag("logentry")
  }

  toObj() {
    let user = this.related.user;
    return {
      text: this.text,
      timestamp: this.timestamp,
      area: this.area?.toObj() || null,
      user: user ? User.from(user).toObjSimple() : null
    }
  }

  get area() {
    return LogArea.from(this.related.area)
  }

  get user() {
    return User.from(this.related.user) || null
  }

  static all() {
    return query.type(LogEntry).tag("logentry").all
  }

  static create(text, areaName = null) {
    return new LogEntry(text, areaName || null)
  }
}

export default LogEntry
