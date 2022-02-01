import fs from 'fs'
import {validateAccess} from "../../services/auth.mjs"
import {join} from "path"

export default (app) => {

  app.get("/jobs", function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;

    let jobs = []
    fs.readdir(join(global.sitecore.storagePath, 'jobs'), (err, files) => {
      if(err) return res.json([])
      files.forEach(file => {
        jobs.push({name: file})
      });
      res.json(jobs)
    });
  });
  app.post("/jobs/:id/run", async function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    
    try{
      let {default: job} = await import(join(global.sitecore.storagePath, 'jobs', req.params.id));
      if(job){
        res.json({success:true, result: await job()});
      }
    } catch(err){
      console.log(err)
      res.json({success: false, error: err})
    }
  });
};