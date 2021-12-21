import express from "express"
const { Router, Request, Response } = express;
const route = Router();

export default (app) => {

  const route = Router();
  app.use("/sample", route)

  route.get('/', function (req, res, next) {
    res.json({message: "Hello World!"})
  });
};