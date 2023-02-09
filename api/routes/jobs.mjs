import { promises as fs } from 'fs'
import {permission} from "../../services/auth.mjs"
import {join} from "path"

export default (app) => {

  app.get("/jobs", permission("admin"), async (req, res, next) => {
    try{
      let jobs = []
      try{
        let physicalFiles = await fs.readdir(join(global.sitecore.storagePath, 'jobs'))
        physicalFiles.forEach(file => {
          jobs.push({name: file, source: "filesystem", owner: null})
        });
      } catch(err){}
      
      try{
        let {default: File} = await import('../../mods/files/models/file.mjs');
        let files = File.allByTag("system-job").filter(f => (f.name.endsWith(".mjs") || f.name.endsWith(".js")) && f.hasAccess(res.locals.user))
        for(let file of files){
          jobs.push({name: file.name, fileId: file._id, source: "files", owner: file.owner?.toObjSimple()})
        }
      } catch(err){}

      res.json(jobs)
    } catch(err){
      console.log(err)
      res.sendStatus(500)
    }
  });

  app.post("/jobs/:id/run", permission("admin"), async (req, res, next) => {
    let file = null;
    
    try{
      let {default: File} = await import('../../mods/files/models/file.mjs');
      file = File.allByTag("system-job").find(f => f.name == req.params.id && f.hasAccess(res.locals.user))
    } catch(err){}
    
    try{
      let filePath = join(global.sitecore.storagePath, 'jobs', req.params.id)
      if(file){
        let handle = await fs.open(filePath, 'w');
        let stream = await handle.createWriteStream();
        await new Promise(resolve => file.blob.pipe(stream).on("finish", resolve))
      }
      
      let {default: job} = await import(`${filePath}?cachebust=${Date.now()}`);
      
      if(file){
        await fs.unlink(filePath)
      }

      if(job){
        res.json({success:true, result: await job()});
      }
    } catch(err){
      console.log(err)
      res.json({success: false, error: ""+err})
    }
  });
};