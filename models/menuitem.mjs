import Entity, {query}  from "entitystorage"
import Setup from "./setup.mjs";

export default class MenuItem extends Entity {

  initNew(title, path, target, owner, type = "auto") {
    if(type == "auto"){
      this.suggestedTitle = title || "Untitled menu item";
      this.suggestedPath = path || "/";
      this.suggestedTarget = target;
      this.suggestedPublic = false;
      this.suggestedHideWhenSignedIn = false;
      this.suggestedRole = null;
      this.suggestedPermission = null;
    } else {
      this.userTitle = title || "Untitled menu item";
      this.userPath = path || "/";
      this.userTarget = target || "/"
      this.userPublic = false;
      this.userHideWhenSignedIn = false;
      this.userRole = null;
      this.userPermission = null;
    }
    this.type = type || "auto";
    this.enabled = true;
    this.tag("coremainmenuitem");
    this.rel(owner, "owner");
  }

  static lookup(id){
    if(!id) return null;
    return query.type(MenuItem).tag("coremainmenuitem").id(id).first
  }

  static lookupPathSuggested(title, path, owner){
    if(!title || !path) return null;
    return query.type(MenuItem).tag("coremainmenuitem").prop("suggestedTitle", title).prop("suggestedPath", path).relatedTo(owner, "owner").first
  }

  static all(){
    return query.type(MenuItem).tag("coremainmenuitem").all
  }

  static allEnabled(){
    return query.type(MenuItem).tag("coremainmenuitem").prop("enabled", true).all
  }

  static allFromOwner(owner){
    return query.type(MenuItem).tag("coremainmenuitem").relatedTo(owner, "owner").all
  }

  static allEnabledFromOwner(owner){
    return query.type(MenuItem).tag("coremainmenuitem").prop("enabled", true).relatedTo(owner, "owner").all
  }

  static resetAll(){
    for(let mi of MenuItem.all()){
      if(mi.type == "auto") mi.reset();
      else mi.delete();
    }
  }

  reset(){
    this.userTitle = null;
    this.userPath = null;
    this.userTarget = null;
    this.userPublic = null;
    this.userHideWhenSignedIn = null;
    this.userRole = null;
    this.userPermission = null;
    this.hide = false;
  }

  get path(){
    return this.userPath ?? this.suggestedPath;
  }

  get title(){
    return this.userTitle ?? this.suggestedTitle;
  }

  get target(){
    return this.userTarget ?? this.suggestedTarget;
  }

  get public(){
    return this.userPublic ?? this.suggestedPublic ?? false;
  }

  get hideWhenSignedIn(){
    return this.userHideWhenSignedIn ?? this.suggestedHideWhenSignedIn ?? false;
  }

  get role(){
    return this.userRole ?? this.suggestedRole ?? null;
  }

  get permission(){
    return this.userPermission ?? this.suggestedPermission ?? null;
  }

  toObj(){
    let owner = this.related.owner;
    let setup = Setup.lookup()
    return {
      id: this._id,
      type: this.type,
      title: this.title,
      path: this.path,
      target: this.target,
      title: this.title,
      owner: owner._id != setup._id ? (owner.id||"N/A") : "core",
      public:  this.public,
      hideWhenSignedIn: this.hideWhenSignedIn,
      role: this.role,
      permission: this.permission,
      hide: this.hide ?? false,
    }
  }
}