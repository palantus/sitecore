import Entity from "entitystorage";
import express from "express"
const { Router, Request, Response } = express;
import service from "../../services/user.mjs"
import {validateAccess} from "../../services/auth.mjs"
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
    if(!validateAccess(req, res, {role: "admin"})) return;
    if(!req.body.id || !req.body.name) throw "id and name are mandatory for users"
    res.json(service(res.locals).add(req.body.id, req.body.name, req.body.roles));
  });

  userRoute.get('/', async function (req, res, next) {
    if(!validateAccess(req, res, {roles: ["team", "admin"]})) return;
    res.json(service(res.locals).active());
  });

  userRoute.get('/list', async function (req, res, next) {
    if(!validateAccess(req, res, {roles: ["team", "admin"]})) return;
    res.json(User.search("tag:user !tag:obsolete").map(u => ({id: u.id, name: u.name})));
  });

  userRoute.delete('/:id', async function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    res.json(service(res.locals).del(req.params.id));
  });

  userRoute.get("/counters", async function (req, res, next) {
    res.json({
      notifications: Entity.search(`tag:notification user.prop:id=${res.locals.user.id} !tag:dismissed`).length,
      actions: Entity.search(`tag:action prop:state=running owner.prop:id=${res.locals.user.id}`).length,
      note: !req.query.page ? false : Entity.find(`tag:wiki prop:"id=${createId(req.query.page.slice(1))}"`) ? true : false
    });
  });

  userRoute.get('/:id', async function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    res.json(service(res.locals).get(req.params.id));
  });

  userRoute.post('/:id/assignToMSAccount/:msid', async function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    let result = service(res.locals).assignToMSAccount(req.params.id, req.params.msid);
    res.json(typeof result === "string" ? { error: result } : true);
  });

  userRoute.patch('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    let user = User.lookup(req.params.id)
    if (!user) throw "Unknown user"

    if (req.body.name !== undefined) user.name = req.body.name
    if (req.body.active !== undefined) {if(req.body.active) user.activate(); else user.deactivate();}
    if (req.body.password !== undefined) user.setPassword(req.body.password || null);

    res.json(true);
  });
  
  /* Me */

  const meRoute = Router();
  app.use("/me", meRoute)

  meRoute.get('/', async function (req, res, next) {
    let u = service(res.locals).me()
    let userObject = u.toObj();
    userObject.msUsers?.forEach(ms => {
      if (ms.id == res.locals.user.activeMSUser) {
        ms.isLoggedIn = true;
      }
    })
    userObject.activeMSUser = res.locals.user.activeMSUser
    userObject.roles = u.roles
    if (u) res.json(userObject); else res.sendStatus(404);
  });

  meRoute.patch('/setup', async function (req, res, next) {
    let u = service(res.locals).me()
    if (!u) throw "No user"
    Object.assign(u.setup, req.body)
  });

  meRoute.get('/token', async (req, res, next) => {
		res.json({token: service(res.locals).getTempAuthToken(res.locals.user)})
	})
  
  /* MS Users */

  const msRoute = Router();
  app.use("/msuser", msRoute)

  msRoute.post('/', async function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    if(!req.body.email) throw "Email is required"
    let msUser = new MSUser(null, {email: req.body.email})
    res.json(true);
  });

  msRoute.patch('/:email', async function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    if(!req.params.email) throw "email is required"
    let msUser = MSUser.lookup(req.params.email)
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

  roleRoute.get("/", (req, res) => {
    if(!validateAccess(req, res, {role: "admin"})) return;
    res.json(Role.all().map(({id}) => ({id})));
  })

  roleRoute.post('/', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    if (!req.body.id) throw "id is mandatory"
    Role.lookupOrCreate(req.body.id)
    res.json({ success: true })
  })

  roleRoute.delete('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    Role.lookup(req.params.id)?.delete();
    res.json({ success: true })
  })

  userRoute.post('/:id/roles', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    let user = User.lookup(req.params.id)
    if (!user) throw "Unknown user"
    if (!req.body.id) throw "id is mandatory"
    user.addRole(req.body.id)
    res.json({success: true});
  });

  userRoute.delete('/:id/roles/:role', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    let user = User.lookup(req.params.id)
    if (!user) throw "Unknown user"
    if (!req.params.role) throw "role is mandatory"
    user.removeRole(req.params.role)
    res.json({success: true});
  });

  /* Permissions */
  
  const permissionRoute = Router();
  app.use("/permission", roleRoute)

  permissionRoute.get("/", (req, res) => {
    if(!validateAccess(req, res, {role: "admin"})) return;
    res.json(Permission.all().map(({id}) => ({id})));
  })

  roleRoute.post('/:id/permissions', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    let role = Role.lookup(req.params.id)
    if (!role) throw "Unknown role"
    if (!req.body.id) throw "id is mandatory"
    role.addPermission(req.body.id)
    res.json({success: true});
  });

  roleRoute.delete('/:id/permissions/:role', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    let role = Role.lookup(req.params.id)
    if (!role) throw "Unknown role"
    if (!req.params.role) throw "role is mandatory"
    role.removePermission(req.params.role)
    res.json({success: true});
  });
};