import Entity, {query} from "entitystorage"
import { uuidv4 } from "../www/libs/uuid.mjs"

export default class Share extends Entity{
  initNew(name, rights, owner) {
    this.name = name
    this.key = uuidv4()
    this.setRights(rights)
    this.tag("share")
    this.rel(owner, "owner")
  }

  setRights(rights){
    this.rights = (rights || "r").toLowerCase().replace(/[^rwx]*/g, "");
  }

  setRight(right, allowed){
    if(allowed && !this.rights.includes(right))
      this.rights = this.rights + right
    else if(!allowed)
      this.rights = this.rights.replace(right, "")
  }

  attach(entity){
    entity.rel(this, "share")
    return this;
  }

  remove(entity){
    entity.removeRel(this, "share")
    return this;
  }

  static mine(entity, user){
    return entity.rels.share?.filter(s => s.related.owner?._id == user._id).map(s => Share.from(s)) || []
  }

  static lookup(id){
    return query.type(Share).id(id).tag("share").first
  }

  isForEntity(entity){
    return !!entity.rels.share?.find(s => s._id == this._id)
  }

  get owner(){
    return this.related.owner
  }

  static hasAccess(entity, key, right, acl){
    if(!key || !entity || !right) return false;
    // Validate that there is a share with that key that includes the requested right
    let share = Share.from(entity.rels.share?.find(a => a.key == key && a.rights?.includes(right)))
    if(!share) return false;
    // Validate that the share owner still has write access
    if(!acl.hasAccess(share.owner, 'w')) return false;
    return true;
  }

  toObj(user, type, id){
    let rights = this.rights;
    return {
      id: this._id,
      name: this.name,
      owner: user.id,
      key: this.key,
      rights: {
        read: rights.includes("r"),
        write: rights.includes("w"),
        execute: rights.includes("x")
      },
      url: `${global.sitecore.siteURL}/${type.uiPath}/${id}?shareKey=${this.key}`
    }
  }
}