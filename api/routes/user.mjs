import Entity from "entitystorage";
import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import service from "../../services/user.mjs"
import {validateAccess} from "../../services/auth.mjs"
import User from "../../models/user.mjs"
import MSUser from "../../models/msuser.mjs"
import { createId } from "../../tools/id.mjs"

export default (app) => {

  const route = Router();
  app.use("/user", route)


  route.post('/', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    if(!req.body.id || !req.body.name) throw "id and name are mandatory for users"
    res.json(service(res.locals).add(req.body.id, req.body.name));
  });

  route.get('/', async function (req, res, next) {
    if(!validateAccess(req, res, {roles: ["team", "admin"]})) return;
    res.json(service(res.locals).active());
  });

  route.get('/list', async function (req, res, next) {
    if(!validateAccess(req, res, {roles: ["team", "admin"]})) return;
    res.json(User.search("tag:user !tag:obsolete").map(u => ({id: u.id, name: u.name})));
  });

  route.delete('/:id', async function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    res.json(service(res.locals).del(req.params.id));
  });

  route.get("/counters", async function (req, res, next) {
    res.json({
      notifications: Entity.search(`tag:notification user.prop:id=${res.locals.user.id} !tag:dismissed`).length,
      actions: Entity.search(`tag:action prop:state=running owner.prop:id=${res.locals.user.id}`).length,
      note: !req.query.page ? false : Entity.find(`tag:wiki prop:"id=${createId(req.query.page.slice(1))}"`) ? true : false
    });
  });

  route.get('/:id', async function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    res.json(service(res.locals).get(req.params.id));
  });

  route.post('/:id/assignToMSAccount/:msid', async function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    let result = service(res.locals).assignToMSAccount(req.params.id, req.params.msid);
    res.json(typeof result === "string" ? { error: result } : true);
  });

  route.patch('/:id', function (req, res, next) {
    if(!validateAccess(req, res, {role: "admin"})) return;
    let user = User.lookup(req.params.id)
    if (!user) throw "Unknown user"

    if (req.body.name !== undefined) user.name = req.body.name
    if (req.body.active !== undefined) {if(req.body.active) user.activate(); else user.deactivate();}
    if (req.body.password !== undefined) user.setPassword(req.body.password || null);
    if (req.body.developer !== undefined) { if (req.body.developer) user.tag("developer"); else user.removeTag("developer"); }
    if (req.body.tester !== undefined) { if (req.body.tester) user.tag("tester"); else user.removeTag("tester"); }
    if (req.body.translator !== undefined) { if (req.body.translator) user.tag("translator"); else user.removeTag("translator"); }
    if (req.body.admin !== undefined) { if (req.body.admin) user.tag("admin"); else user.removeTag("admin"); }
    if (req.body.team !== undefined) { if (req.body.team) user.tag("team"); else user.removeTag("team"); }

    res.json(true);
  });

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

};