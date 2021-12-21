import Notification from "../../models/notification.mjs"
import User from "../../models/user.mjs"
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

import express from "express"
const { Router, Request, Response } = express;
const route = Router();

export default (app) => {

  const route = Router();
  app.use("/notifications", route)

  route.get('/', async function (req, res, next) {
    res.json(Notification.search(`tag:notification !tag:dismissed user.prop:id=${res.locals.user.id}`).map(n => ({
      id: n._id,
      area: n.area,
      message: n.message,
      details: n.related.details?.props || null,
      timestamp: n.timestamp
    })))
  });

  route.post('/:id/dismiss', async function (req, res, next) {
    let notification = Notification.lookup(req.params.id)
    if (!notification) throw "Unknown notification: " + req.params.id
    notification.dismiss();
    res.json({ success: true })
  });

  route.post('/dismissall', async function (req, res, next) {
    Notification.search(`tag:notification !tag:dismissed user.prop:id=${res.locals.user.id}`).forEach(n => n.dismiss())
    res.json({ success: true })
  });

  route.post('/', function (req, res, next) {
    if(!req.body.area) throw "area missing";
    if(!req.body.message) throw "message missing";
    new Notification(User.lookup(res.locals.userId) || res.locals.user, req.body.area, req.body.message, req.body.details || null)
    res.json({ success: true })
  });

};