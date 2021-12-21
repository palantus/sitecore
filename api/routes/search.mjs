import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import Entity from "entitystorage";
import { findDangerousChanges } from "graphql";
import {getTimestamp} from "../../tools/date.mjs"

export default (app) => {

  const route = Router();
  app.use("/search", route)

  route.get('/tokens/:type', function (req, res, next) {
    console.log("STUB: Fix search help for modules")
    switch(req.params.type){
      default:
        res.json([])
    }
  });
};