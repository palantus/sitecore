import fs from 'fs'

export default (app) => {

  app.get("/jobs", function (req, res, next) {
    let jobs = []
    fs.readdir('jobs', (err, files) => {
      if(err) return res.json([])
      files.forEach(file => {
        jobs.push({name: file})
      });
      res.json(jobs)
    });
  });
  app.post("/jobs/:id/run", async function (req, res, next) {
    let {default: job} = await import(`../../jobs/${req.params.id}`);
    if(job){
      res.json({success:true, result: await job()});
    }
  });
};