import Entity, {query, nextNum} from "entitystorage"

export default class Remote extends Entity {
  initNew({title, apiKey, url} = {}) {
    this.id = nextNum("remote")
    this.title = title || "New Remote"
    this.url = url || null
    this.apiKey = apiKey || null
    this.tag("remote")
  }

  static lookup(id){
    if(!id) return null;
    return query.type(Remote).tag("remote").prop("id", id).first
  }

  static all(){
    return query.type(Remote).tag("remote").all
  }

  toObj() {
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      apiKey: this.apiKey
    }
  }

}