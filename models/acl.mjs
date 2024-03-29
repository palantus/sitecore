import Entity, { query } from "entitystorage"
import Permission from "./permission.mjs"
import Role from "./role.mjs"
import Share from "./share.mjs"
import User from "./user.mjs"

export default class ACL{

  constructor(entity, type){
    this.entity = entity
    this.aclString = entity.acl || type.acl

    this.acl = ACL.parse(this.aclString)
    this.acl.supportInheritance = !!type.aclInheritance
    this.type = type
  }

  handlePatch(aclString){
    let newAcl = ACL.parse(aclString)
    
    let conv = (a, r, u, p) => {
      if(!["private", "shared", "role", "public", "users", "inherit", "permission"].includes(a)) return "private";
      if(a == "role" && !Role.lookup(r)) return "private";
      if(a == "permission" && !Permission.lookup(p)) return "private";
      return a == "role" ? `${a}:${r}` 
           : a == "permission" ? `${a}:${p}` 
           : a == "users" ? `${a}:${u}` 
           : a 
    }
    this.entity.acl = (newAcl.read ? `r:${conv(newAcl.read.access, newAcl.read.role, newAcl.read.users, newAcl.read.permission)};` : '')
                    + (newAcl.write ? `w:${conv(newAcl.write.access, newAcl.write.role, newAcl.write.users, newAcl.write.permission)};` : '')
                    + (newAcl.execute ? `x:${conv(newAcl.execute.access, newAcl.execute.role, newAcl.execute.users, newAcl.execute.permission)}` : '')
    this.acl = newAcl
  }

  static parse(aclString){
    let s = aclString.split(";")
    let read = s.find(v => v.startsWith("r:"))?.substring(2).split(":") || null
    let write = s.find(v => v.startsWith("w:"))?.substring(2).split(":") || null
    let exec = s.find(v => v.startsWith("x:"))?.substring(2).split(":") || null
    return {
      read: read ? {
        access: read[0],
        role: read[0] == "role" ? (read[1]||null) : undefined,
        permission: read[0] == "permission" ? (read[1]||null) : undefined,
        users: read[0] == "users" ? (read[1]||"").split(",") : undefined
      } : null,
      write: write ? {
        access: write[0],
        role: write[0] == "role" ? (write[1]||null) : undefined,
        permission: write[0] == "permission" ? (write[1]||null) : undefined,
        users: write[0] == "users" ? (write[1]||"").split(",") : undefined
      } : null,
      execute: exec ? {
        access: exec[0],
        role: exec[0] == "role" ? (exec[1]||null) : undefined,
        permission: exec[0] == "permission" ? (exec[1]||null) : undefined,
        users: exec[0] == "users" ? (exec[1]||"").split(",") : undefined
      } : null,
    }
  }

  static setDefault(user, type, aclString){
    let def = ACL.getDefaultEntity(user, type)
    def.acl = aclString
  }

  static setDefaultACLOnEntity(entity, user, type){
    if(!entity || !type) return;
    let def = ACL.getDefaultEntity(user, type)
    entity.acl = def?.acl || type.acl || undefined
    entity.rel(user, "owner")
  }

  static getDefaultEntity(user, type){
    return Entity.find(`tag:acldef type.id:${type} user.id:${user}`) || new Entity().tag("acldef").rel(type, "type").rel(user, "user")
  }

  static getAllUserDefaults(user){
    return query.tag("acldef").relatedTo(user, "user").all
  }

  accessFromCode(code){
    return code == 'w' ? (this.acl.write?.access || "private")
         : code == 'x' ? (this.acl.execute?.access || "private")
         : (this.acl.read?.access || "private")
  }

  roleFromCode(code){
    return code == 'w' ? (this.acl.write?.role || null)
         : code == 'x' ? (this.acl.execute?.role || null)
         : (this.acl.read?.role || null)
  }

  permissionFromCode(code){
    return code == 'w' ? (this.acl.write?.permission || null)
         : code == 'x' ? (this.acl.execute?.permission || null)
         : (this.acl.read?.permission || null)
  }

  usersFromCode(code){
    return code == 'w' ? (this.acl.write?.users || null)
         : code == 'x' ? (this.acl.execute?.users || null)
         : (this.acl.read?.users || null)
  }

  hasAccess(user, accessTypeCode, shareKey){
    let access = this.accessFromCode(accessTypeCode)

    let result;
    switch(access){
      case "public":
        result = true;
        break;
      case "role":
        let role = this.roleFromCode(accessTypeCode)
        result = !role || !!user?.roles.includes(role)
        break;
      case "permission":
        let permission = this.permissionFromCode(accessTypeCode)
        result = !permission || !!user?.permissions.includes(permission)
        break;
      case "private":
        let owner = this.entity.related.owner;
        if(!owner && user && user.permissions.includes("admin"))
          result = true
        else
          result = user && user._id == owner?._id
        break;
      case "shared": 
        result = user && user.id != "guest"
        break;
      case "users":
        let users = this.usersFromCode(accessTypeCode)
        result = users && users.includes(user.id)
        break;
      case "inherit":
        let parent = this.entity.related.parent
        result = parent ? new ACL(parent, this.type.aclParent).hasAccess(user, accessTypeCode, shareKey) : false 
        break;
      default:
        result = !!user
    }
    return    !!result 
              // If you are owner, you always have access
           || (!!user && this.entity.related.owner?.id == user?.id) 
              // If you have access through a share, you have access
           || Share.hasAccess(this.entity, shareKey, accessTypeCode, this)
              // If you have w or x access, you also have r access
           || ((accessTypeCode == "r" || !accessTypeCode) && (this.hasAccess(user, "w", shareKey) || this.hasAccess(user, "x", shareKey)))
  }

  validateAccess(res, right, respondIfFalse = true){
    if(!this.hasAccess(res.locals.user, right, res.locals.shareKey) && !res.locals.permissions?.includes("admin")){
      if(respondIfFalse) res.status(403).json({ error: `You do not have the required access to do this` })
      return false;
    }
    return true;
  }

  get owner(){
    return User.from(this.entity.related.owner)
  }

  toObj(user, isAdmin){
    let owner = this.owner
    return {
      owner: owner?.id||null,
      canEdit: (owner?._id == user?._id || isAdmin) && user?._id != "guest",
      ...this.acl
    }
  }
}