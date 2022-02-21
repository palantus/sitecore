import ACL from "../../models/acl.mjs";
import User from "../../models/user.mjs";
import DataType from "../../models/datatype.mjs";
import Entity, { sanitize } from "entitystorage";

export function aclPreAuth(app) {

  app.get("/acl/:type/:id", function (req, res, next) {
    let type = DataType.lookup(sanitize(req.params.type))
    if(!type) throw "Unknown type"
    if(!type.acl) throw "Type doesn't allow ACLs"
    if(!type.query) throw "Type doesn't have a query"
    let id = sanitize(req.params.id)
    let entity = Entity.find(`(id:${id}|prop:"id=${id}") (${type.query})`)
    if(!entity) throw "Entity is of wrong/invalid type"
    let acl = new ACL(entity, type)
    res.json(acl.toObj())
  });
}

export function aclPostAuth(app) {

  app.patch("/acl/:type/default", function (req, res, next) {
    if(!req.body.acl || typeof req.body.acl !== "string" || req.body.acl.length > 100) throw "Invalid acl"
    let type = DataType.lookup(sanitize(req.params.type))
    if(!type) throw "Unknown type"
    if(!type.acl) throw "Type doesn't allow ACLs"
    if(!type.query) throw "Type doesn't have a query"
    ACL.setDefault(res.locals.user, type, req.body.acl)
    res.json({success: true})
  });

  app.patch("/acl/:type/:id", function (req, res, next) {
    let type = DataType.lookup(sanitize(req.params.type))
    if(!type) throw "Unknown type"
    if(!type.acl) throw "Type doesn't allow ACLs"
    if(!type.query) throw "Type doesn't have a query"
    let id = sanitize(req.params.id)
    let entity = Entity.find(`(id:${id}|prop:"id=${id}") (${type.query})`)
    if(!entity) throw "Entity is of wrong/invalid type"
    let acl = new ACL(entity, type)
    if(!acl.validateAccess(res, 'w')) return; // Must have write access to change acl
    if(req.body.acl && typeof req.body.acl === "string"){
      acl.handlePatch(req.body.acl)
    }

    if(req.body.owner && res.locals.permissions.includes("admin")){
      let user = User.lookup(sanitize(req.body.owner))
      if(!user) throw "Invalid new owner id"
      entity.rel(user, "owner", true)
    }

    res.json(acl.toObj())
  });
};