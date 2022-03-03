import ACL from "../../models/acl.mjs";
import User from "../../models/user.mjs";
import DataType from "../../models/datatype.mjs";
import Entity, { sanitize } from "entitystorage";
import Share from "../../models/share.mjs";
import {noGuest} from "../../services/auth.mjs"
import express from "express"
const { Router, Request, Response } = express;

export default (app) => {

  const route = Router();
  app.use("/acl", route)

  route.get("/:type/:id", function (req, res, next) {
    let type = DataType.lookup(sanitize(req.params.type))
    if(!type) throw "Unknown type"
    if(!type.acl) throw "Type doesn't allow ACLs"
    let id = sanitize(req.params.id)
    let entity = type.lookupEntity(id)
    if(!entity) throw "Entity is of wrong/invalid type"
    let acl = new ACL(entity, type)
    res.json({
      ...acl.toObj(res.locals.user, res.locals.permissions.includes("admin")), 
      shares: res.locals.user?.id == "guest" ? [] : Share.mine(entity, res.locals.user).map(s => s.toObj(res.locals.user, type, id))
    })
  });

  route.patch("/:type/default", function (req, res, next) {
    if(!req.body.acl || typeof req.body.acl !== "string" || req.body.acl.length > 100) throw "Invalid acl"
    let type = DataType.lookup(sanitize(req.params.type))
    if(!type) throw "Unknown type"
    if(!type.acl) throw "Type doesn't allow ACLs"
    ACL.setDefault(res.locals.user, type, req.body.acl)
    res.json({success: true})
  });

  route.patch("/:type/:id", function (req, res, next) {
    let type = DataType.lookup(sanitize(req.params.type))
    if(!type) throw "Unknown type"
    if(!type.acl) throw "Type doesn't allow ACLs"
    let id = sanitize(req.params.id)
    let entity = type.lookupEntity(id)
    if(!entity) throw "Entity is of wrong/invalid type"
    let acl = new ACL(entity, type)
    if(acl.owner?._id != res.locals.user._id && !res.locals.permissions.includes("admin")) throw "Only owner and admin can change ACL";
    if(req.body.acl && typeof req.body.acl === "string"){
      acl.handlePatch(req.body.acl)
    }

    if(req.body.owner && res.locals.permissions.includes("admin")){
      let user = User.lookup(sanitize(req.body.owner))
      if(!user) throw "Invalid new owner id"
      entity.rel(user, "owner", true)
    }

    res.json(acl.toObj(res.locals.user, res.locals.permissions.includes("admin")))
  });

  /* Shares */

  route.post('/:type/:id/share', noGuest, function (req, res, next) {
    let type = DataType.lookup(sanitize(req.params.type))
    if(!type) throw "Unknown type"
    let id = sanitize(req.params.id)
    let entity = type.lookupEntity(id)
    if(!entity) throw "Entity is of wrong/invalid type"
    let acl = new ACL(entity, type)
    if(!acl.validateAccess(res, 'w')) return;
    let share = new Share(req.body.name||"share", req.body.rights||"r", res.locals.user)
    share.attach(entity)
    res.json(share.toObj(res.locals.user, type, id))
  })

  route.patch('/:type/:id/share/:share', noGuest, function (req, res, next) {
    let type = DataType.lookup(sanitize(req.params.type))
    if(!type) throw "Unknown type"
    let id = sanitize(req.params.id)
    let entity = type.lookupEntity(id)
    if(!entity) throw "Entity is of wrong/invalid type"
    let acl = new ACL(entity, type)
    if(!acl.validateAccess(res, 'w')) return;
    let shareId = sanitize(req.params.share)
    let share = Share.lookup(shareId)
    if(!share.isForEntity(entity)) throw "That share is not for the given entity"
    if(share.owner._id != res.locals.user._id) throw "You do not own this share"
    if(req.body.name && typeof req.body.name === "string") share.name = req.body.name;
    if(typeof req.body.rights === "string") share.setRights(req.body.rights)
    if(typeof req.body.read === "boolean") share.setRight('r', req.body.read)
    if(typeof req.body.write === "boolean") share.setRight('w', req.body.write)
    if(typeof req.body.execute === "boolean") share.setRight('x', req.body.execute)
    res.json(share.toObj(res.locals.user, type, id))
  })

  route.delete('/:type/:id/share/:share', noGuest, function (req, res, next) {
    let type = DataType.lookup(sanitize(req.params.type))
    if(!type) throw "Unknown type"
    let id = sanitize(req.params.id)
    let entity = type.lookupEntity(id)
    if(!entity) throw "Entity is of wrong/invalid type"
    let acl = new ACL(entity, type)
    if(!acl.validateAccess(res, 'w')) return;
    let shareId = sanitize(req.params.share)
    let share = Share.lookup(shareId)
    if(!share.isForEntity(entity)) throw "That share is not for the given entity"
    if(share.owner._id != res.locals.user._id) throw "You do not own this share"
    share.delete()
    res.json({success: true});
  })

  route.get("/:type/:id/share", noGuest, (req, res) => {
    let type = DataType.lookup(sanitize(req.params.type))
    if(!type) throw "Unknown type"
    let id = sanitize(req.params.id)
    let entity = type.lookupEntity(id)
    if(!entity) throw "Entity is of wrong/invalid type"
    let acl = new ACL(entity, type)
    if(!acl.validateAccess(res, 'w')) return;
    res.json(Share.mine(entity, res.locals.user).map(s => s.toObj(res.locals.user, type, id)));
  })
};