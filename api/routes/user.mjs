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
    if(!req.body.id || !req.body.name) throw "id and name are mandatory for users"
    res.json(service(res.locals).add(sanitize(req.body.id), req.body.name, req.body.roles));
  });

  userRoute.get('/', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.read"})) return;
    res.json(service(res.locals).active());
  });

  userRoute.get('/list', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.read"})) return;
    res.json(User.search("tag:user !tag:obsolete").map(u => ({id: u.id, name: u.name})));
  });

  userRoute.delete('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.edit"})) return;
    res.json(service(res.locals).del(sanitize(req.params.id)));
  });

  userRoute.get("/counters", function (req, res, next) {
    res.json({
      notifications: query.tag("notification").relatedTo(res.locals.user, "user").not(query.tag("dismissed")).count,
      actions: query.tag("action").prop("state", "running").relatedTo(res.locals.user, "owner").count,
      note: !req.query.page ? false : query.tag("wiki").prop("id", createId(sanitize(req.query.page).slice(1))).exists
    });
  });

  userRoute.get('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.read"})) return;
    res.json(service(res.locals).get(sanitize(req.params.id)));
  });

  userRoute.post('/:id/assignToMSAccount/:msid', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.edit"})) return;
    let result = service(res.locals).assignToMSAccount(sanitize(req.params.id), sanitize(req.params.msid));
    res.json(typeof result === "string" ? { error: result } : true);
  });

  userRoute.patch('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "user.edit"})) return;
    let user = User.lookup(sanitize(req.params.id))
    if (!user) throw "Unknown user"

    if (req.body.name !== undefined) user.name = req.body.name
    if (req.body.active !== undefined) {if(req.body.active) user.activate(); else user.deactivate();}
    if (req.body.password !== undefined) user.setPassword(req.body.password || null);

    res.json(true);
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
    Object.assign(u.setup, req.body)
    res.json({success: true})
  });

  meRoute.get('/', function (req, res, next) {
    let u = service(res.locals).me()
    let userObject = u.toObj();
    userObject.msUsers?.forEach(ms => {
      if (ms.id == res.locals.user.activeMSUser) {
        ms.isLoggedIn = true;
      }
    })
    userObject.activeMSUser = res.locals.user.activeMSUser
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

    if(!req.body.newPass || !req.body.existingPass) throw "missing newPass or existingPass"
    
    if(u.validatePassword(req.body.existingPass)){
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