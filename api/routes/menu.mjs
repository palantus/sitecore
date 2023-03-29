import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import {lookupType, permission} from "../../services/auth.mjs"
import MenuItem from "../../models/menuitem.mjs";
import { generateMenu } from "../../services/menu.mjs";
import Setup from "../../models/setup.mjs";

export default (app) => {

  // Endpoint: /system/menu

  app.use("/system/menu", permission("admin"), route)

  route.get("/", (req, res) => {
    res.json(MenuItem.all().map(m => m.toObj()))
  })

  route.post("/regen", (req, res) => {
    generateMenu();
    res.json({success: true});
  })

  route.post("/reset", (req, res) => {
    MenuItem.resetAll();
    res.json({success: true});
  })

  route.post("/items", (req, res) => {
    if(!req.body.title || typeof req.body.title !== "string") throw "Invalid title";
    if(!req.body.path || typeof req.body.path !== "string") throw "Invalid path";
    if(!req.body.target || typeof req.body.target !== "string") throw "Invalid target";
    if(MenuItem.lookupPathSuggested(req.body.path, req.body.title)) throw "Menu item already exists";
    let path = req.body.path.startsWith("/") ? req.body.path : "/"+req.body.path;
    let target = req.body.target.startsWith("/") ? req.body.target : "/"+req.body.target;
    let mi = new MenuItem(req.body.title, path, target, Setup.lookup(), "user");
    res.json({success: true, mi: mi.toObj()});
  })

  // Endpoint: /system/menu/item/<id>

  const idRoute = Router();
  app.use("/system/menu/item/:id", permission("admin"), lookupType(MenuItem, "mi"), idRoute);
  
  idRoute.get("/", (req, res) => {
    res.json(res.locals.mi.toObj())
  })

  idRoute.patch("/", (req, res) => {
    if(req.body.title !== undefined) {
      if(!req.body.title && res.locals.mi.type != "auto") res.locals.mi.delete();
      if(req.body.title) res.locals.mi.userTitle = req.body.title;
    }
    if(req.body.path !== undefined) {
      if(!req.body.path && res.locals.mi.type != "auto") res.locals.mi.delete();
      if(req.body.path) res.locals.mi.userPath = (req.body.path && !req.body.path.startsWith("/")) ? "/"+req.body.path : req.body.path;
    }
    if(req.body.target !== undefined) res.locals.mi.userTarget = (req.body.target && !req.body.target.startsWith("/")) ? "/"+req.body.target : req.body.target;
    if(req.body.public !== undefined) res.locals.mi.userPublic = !!req.body.public;
    if(req.body.hideWhenSignedIn !== undefined) res.locals.mi.userHideWhenSignedIn = !!req.body.hideWhenSignedIn;
    if(req.body.role !== undefined) res.locals.mi.userRole = req.body.role;
    if(req.body.permission !== undefined) res.locals.mi.userPermission = req.body.permission;
    if(req.body.hide !== undefined) res.locals.mi.hide = !!req.body.hide;
    res.json({success: true})
  })
};