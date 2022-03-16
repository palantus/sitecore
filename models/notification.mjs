import Entity, {query} from "entitystorage"
import {getTimestamp} from "../tools/date.mjs"
import {sendEvent} from "../services/clientevents.mjs"

export default class Notification extends Entity{
  initNew(user, area, message, details){
    new Entity().tag("test")
    if(!user || !user._id) throw "User is mandatory for notifications"
    this.rel(user, "user")
    this.area = area
    this.message = message
    
    if(details)
      this.rel(Object.assign(new Entity(), details), "details")

    this.timestamp = getTimestamp()
    this.tag("notification")

    sendEvent(this.related.user.id, "notification-new", {id: this._id, area, message, details})
  }

  dismiss(){
    sendEvent(this.related.user.id, "notification-dismissed", {id: this._id})
    this.delete()
  }

  static lookup(id){
    return query.type(Notification).id(id).tag("notification").first
  }
}