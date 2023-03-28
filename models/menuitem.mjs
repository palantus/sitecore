import Entity, {query}  from "entitystorage"

export default class MenuItem extends Entity {

  initNew(title, path, target, owner, type = "auto") {
    if(type == "auto"){
      this.suggestedTitle = title || "Untitled menu item";
      this.suggestedPath = path || "/";
    } else {
      this.userTitle = title || "Untitled menu item";
      this.userPath = path || "/";
    }
    this.type = type || "auto";
    this.enabled = true;
    this.target = target;
    this.tag("coremainmenuitem");
    this.rel(owner, "owner");
  }

  static lookup(title, path){
    return query.type(MenuItem).tag("coremainmenuitem").prop("title", title).prop("path", path).first
  }

  static lookupOrCreate(id){
    return MenuItem.lookup(id) || new MenuItem(id)
  }

  static all(){
    return query.type(MenuItem).tag("coremainmenuitem").all
  }

  static allFromOwner(owner){
    return query.type(MenuItem).tag("coremainmenuitem").relatedTo(owner, "owner").all
  }

  static allEnabledFromOwner(owner){
    return query.type(MenuItem).tag("coremainmenuitem").prop("enabled", true).relatedTo(owner, "owner").all
  }

  get path(){
    return this.userPath || this.suggestedPath;
  }

  get title(){
    return this.userTitle || this.suggestedTitle;
  }

  toObj(){
    return {
      id: this._id,
      title: this.title
    }
  }
}