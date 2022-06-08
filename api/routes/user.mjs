import Entity, {query, sanitize} from "entitystorage";
import express from "express"
const { Router, Request, Response } = express;
import service from "../../services/user.mjs"
import {noGuest, validateAccess} from "../../services/auth.mjs"
import User from "../../models/user.mjs"
import MSUser from "../../models/msuser.mjs"
import { createId } from "../../tools/id.mjs"
import Role from "../../models/role.mjs";
import Permission from "../../models/permission.mjs";

export default (app) => {

  const userRoute = Router();
  app.use("/user", userRoute)

  /* User */

  userRoute.post('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.edit"})) return;
    if(!req.body.id || !req.body.name || typeof req.body.name !== "string") throw "id and name are mandatory for users"
    if(!User.validateUserId(req.body.id)) throw "Invalid user id";
    if(User.lookup(req.body.id)) throw "User already exists"
    res.json(service(res.locals).add(req.body.id, req.body.name, req.body.roles));
  });

  userRoute.get('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.read"})) return;
    res.json(service(res.locals).active());
  });

  userRoute.get('/list', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.read"})) return;
    res.json(User.search("tag:user !tag:obsolete").map(u => ({id: u.id, name: u.name})));
  });

  /*
  userRoute.delete('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.edit"})) return;
    res.json(service(res.locals).del(sanitize(req.params.id)));
  });
  */

  userRoute.get("/counters", function (req, res, next) {
    res.json({
      notifications: query.tag("notification").relatedTo(res.locals.user, "user").count
    });
  });

  userRoute.get('/:id', function (req, res, next) {
    if(res.locals.user.id != req.params.id && !validateAccess(req, res, {permission: "user.read"})) return;
    res.json(service(res.locals).get(sanitize(req.params.id)));
  });

  userRoute.post('/:id/assignToMSAccount', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.edit"})) return;
    let user = User.lookup(req.params.id)
    if(!user) throw "User doesn't exist";
    let msid = req.body.msid

    let msUser = MSUser.lookup(msid)
    if(!msUser && req.body.createIfMissing === true && User.validateEmailAddress(msid)){
      msUser = new MSUser(null, {email: msid})
    }

    if (msUser) {
      if (msUser.related.user && msUser.related.user.id != id) {
        throw "MS user is already assigned to another user"
      } else {
        msUser.rel(user, "user")
        res.json(true)
      }
    } else {
      throw "MS user doesn't exist. Try logging in with it first."
    }
  });

  userRoute.patch('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.edit"})) return;
    let user = User.lookup(sanitize(req.params.id))
    if (!user) throw "Unknown user"

    if (req.body.name !== undefined) user.name = req.body.name
    if (req.body.active !== undefined) {if(req.body.active) user.activate(); else user.deactivate();}
    if (req.body.password !== undefined) user.setPassword(req.body.password || null);
    if(typeof req.body.email === "string") {
      if(req.body.email && !User.validateEmailAddress(req.body.email)) throw "Invalid email"
      user.email = req.body.email;
    }

    res.json(true);
  });

  userRoute.post('/:id/change-id', noGuest, function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    if(!req.body.newId) throw "missing newId"
    if(!User.validateUserId(req.body.newId)) throw "Invalid user id";
    let user = User.lookup(req.params.id)
    if (!user) throw "Unknown user"
    if(User.lookup(req.body.newId)) throw "User id is already in use"
    user.id = req.body.newId
    res.json(true)
  });
  
  /* Me */

  const meRoute = Router();
  app.use("/me", meRoute)

  meRoute.get('/setup', function (req, res, next) {
    let u = service(res.locals).me()
    if (!u) throw "No user"
    res.json(u.setup?.props||{})
  });

  meRoute.patch('/setup', noGuest, function (req, res, next) {
    let u = service(res.locals).me()
    if (!u) throw "No user"
    if(typeof req.body.home === "string") u.setup.home = req.body.home;
    if(typeof req.body.name === "string" && req.body.name) u.name = req.body.name;
    if(typeof req.body.email === "string") {
      if(req.body.email && !User.validateEmailAddress(req.body.email)) throw "Invalid email"
      u.email = req.body.email;
    }
    res.json({success: true})
  });

  meRoute.get('/', function (req, res, next) {
    let u = service(res.locals).me()
    let userObject = u.toObj();
    userObject.roles = u.roles
    userObject.permissions = u.permissions
    userObject.setup = u.setup?.props||{}
    if (u) res.json(userObject); else res.sendStatus(404);
  });

  meRoute.get('/token', noGuest, (req, res, next) => {
		res.json({token: service(res.locals).getTempAuthToken(res.locals.user)})
	})

  meRoute.post('/changepass', noGuest, function (req, res, next) {
    let u = service(res.locals).me()
    if (!u) throw "No user"

    if(!req.body.newPass || req.body.existingPass === undefined) throw "missing newPass or existingPass"
    
    if(!u.hasPassword() || u.validatePassword(req.body.existingPass)){
      u.setPassword(req.body.newPass)
    } else {
      res.status(501).json({success: false, error: "Wrong password"})
      return;
    }

    res.json(true)
  });
  
  /* MS Users */

  const msRoute = Router();
  app.use("/msuser", msRoute)

  msRoute.post('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.edit"})) return;
    if(!req.body.email) throw "Email is required"
    let msUser = new MSUser(null, {email: req.body.email})
    res.json(true);
  });

  msRoute.patch('/:email', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.edit"})) return;
    if(!req.params.email) throw "email is required"
    let msUser = MSUser.lookup(sanitize(req.params.email))
    if(!msUser) throw "Unknown user"
    if(typeof req.body.vsts == "boolean") {
      if(req.body.vsts) msUser.tag("vsts")
      else msUser.removeTag("vsts")
    }
    res.json(true);
  });

  /* Roles */
  
  const roleRoute = Router();
  app.use("/role", roleRoute)

  roleRoute.post('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    if (!req.body.id) throw "id is mandatory"
    Role.lookupOrCreate(sanitize(req.body.id))
    res.json({ success: true })
  })

  roleRoute.delete('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    Role.lookup(sanitize(req.params.id))?.delete();
    res.json({ success: true })
  })

  roleRoute.get("/:id", (req, res) => {
    let role = Role.lookup(sanitize(req.params.id))
    if(!role) throw "Unknown role"
    res.json({id: role.id, permissions: role.rels.permission?.map(p => p.id)||[]});
  })

  roleRoute.get("/", (req, res) => {
    res.json(Role.all().map(({id}) => ({id})));
  })

  userRoute.post('/:id/roles', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let user = User.lookup(sanitize(req.params.id))
    if (!user) throw "Unknown user"
    if (!req.body.id) throw "id is mandatory"
    user.addRole(sanitize(req.body.id))
    res.json({success: true});
  });

  userRoute.delete('/:id/roles/:role', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let user = User.lookup(sanitize(req.params.id))
    if (!user) throw "Unknown user"
    if (!req.params.role) throw "role is mandatory"
    user.removeRole(sanitize(req.params.role))
    res.json({success: true});
  });

  /* Permissions */
  
  const permissionRoute = Router();
  app.use("/permission", permissionRoute)

  roleRoute.post('/:id/permissions', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let role = Role.lookup(sanitize(req.params.id))
    if (!role) throw "Unknown role"
    if (!req.body.id) throw "id is mandatory"
    role.addPermission(sanitize(req.body.id))
    res.json({success: true});
  });

  roleRoute.delete('/:id/permissions/:perm', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let role = Role.lookup(sanitize(req.params.id))
    if (!role) throw "Unknown role"
    if (!req.params.perm) throw "perm is mandatory"
    role.removePermission(sanitize(req.params.perm))
    res.json({success: true});
  });

  permissionRoute.get("/", (req, res) => {
    res.json(Permission.all().map(({id}) => ({id})));
  })
};