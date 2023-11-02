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

  route.post("/update-check", (req, res) => {
    Mod.checkUpdates().then(() => res.json({success: true}))
  })

  route.post("/refresh-available", (req, res) => {
    Mod.refreshAvailableMods().then(() => res.json({success: true}))
  })

  route.get("/installed", (req, res) => {
    res.json(Mod.installed().map(m => m.toObj()))
  })

  /* Endpoint: /mod/<id> */

  const idRoute = Router();
  app.use("/system/mod/:id", permission("admin"), lookupType(Mod, "mod"), idRoute);
  
  idRoute.get("/readme", (req, res) => {
    res.json({html: res.locals.mod.readme||null})
  })
  
  idRoute.get("/package", (req, res) => {
    res.json(JSON.parse(res.locals.mod.package||"{}"))
  })

  idRoute.post("/install", (req, res) => {
    res.locals.mod.install().then(resp => res.json(resp))
  })

  idRoute.post("/uninstall", (req, res) => {
    res.locals.mod.uninstall().then(resp => res.json(resp))
  })

  idRoute.get("/", (req, res) => {
    res.json(res.locals.mod.toObj())
  })

  idRoute.patch("/", (req, res) => {
    if(req.body.enabled !== undefined) res.locals.mod.enabled = !!req.body.enabled
    res.json({success: true})
  })

  idRoute.post("/update", (req, res) => {
    res.locals.mod.update().then(resp => res.json({success: true, resp}))
  })
};