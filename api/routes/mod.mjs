import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import {lookupType, permission} from "../../services/auth.mjs"
import Mod from "../../models/mod.mjs";

export default (app) => {

  /* Endpoint: /mods */

  app.use("/system/mods", permission("admin"), route)

  route.get("/", (req, res) => {
    res.json(Mod.all().map(m => m.toObj()))
  })

  /* Endpoint: /mod/<id> */

  const idRoute = Router();
  app.use("/system/mod/:id", permission("admin"), lookupType(Mod, "mod"), idRoute);
  
  idRoute.get("/", (req, res) => {
    res.json(res.locals.mod.toObj())
  })

  idRoute.patch("/", (req, res) => {
    if(req.body.enabled !== undefined) res.locals.mod.enabled = !!req.body.enabled
    res.json({success: true})
  })
};