import Notification from "../../models/notification.mjs"
import User from "../../models/user.mjs"
import { sanitize } from "entitystorage";

import express from "express"
const { Router, Request, Response } = express;

export default (app) => {

  const route = Router();
  app.use("/notifications", route)

  route.get('/', function (req, res, next) {
    res.json(res.locals.user.notifications.map(n => ({
      id: n._id,
      area: n.area,
      message: n.message,
      details: n.related.details?.props || null,
      timestamp: n.timestamp
    })))
  });

  route.post('/:id/dismiss', function (req, res, next) {
    let notification = Notification.lookup(sanitize(req.params.id))
    if (!notification) throw "Unknown notification: " + req.params.id
    if (notification.related.user?._id != res.locals.user._id) throw "Not your notification";
    notification.dismiss();
    res.json({ success: true })
  });

  route.post('/dismissall', function (req, res, next) {
    res.locals.user.notifications.forEach(n => n.dismiss())
    res.json({ success: true })
  });

  route.post('/', function (req, res, next) {
    if(!req.body.area) throw "area missing";
    if(!req.body.message) throw "message missing";
    new Notification(res.locals.user, req.body.area, req.body.message, req.body.details || null)
    res.json({ success: true })
  });

};