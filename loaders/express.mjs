import express from 'express';
//import bodyParser from 'body-parser';
import cors from 'cors';
import routes from '../api/index.mjs';
import cookieParser from 'cookie-parser';
import OpenApiValidatorImport from 'express-openapi-validator';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fileUpload from 'express-fileupload';
import Setup from '../models/setup.mjs';

const OpenApiValidator = OpenApiValidatorImport.OpenApiValidator;
const __dirname = dirname(fileURLToPath(import.meta.url));

export default async ({ app, mode, config }) => {

  let apiPrefix = process.env.API_PREFIX || (mode == "combined" ? "api" : "");

  if(mode != "www"){
    // Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
    // It shows the real origin IP in the heroku or Cloudwatch logs
    app.enable('trust proxy');

    // The magic package that prevents frontend developers going nuts
    // Alternate description:
    // Enable Cross Origin Resource Sharing to all origins by default
    app.use(cors({
      credentials: true,
      origin: function (origin, callback) {
        callback(null, true)
      },
      maxAge: 86400 //Enable OPTIONS caching
    }));
    
    // Middleware that transforms the raw string of req.body into json
    
    //app.use(bodyParser.urlencoded());
    //app.use(bodyParser.text());
    //app.use(bodyParser.json());
    
    app.use(fileUpload());
    app.use(express.json());
    app.use(express.text());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use('/spec', express.static(join(__dirname, '../openapi.yaml')));

    // 1. Install the OpenApiValidator on your express app
    
    /*
    await new OpenApiValidator({
      apiSpec: './openapi.yaml',
      validateResponses: false
      // securityHandlers: {
      //   ApiKeyAuth: (req, scopes, schema) => true,
      // },
    }).install(app);
    */

    let setup = Setup.lookup()
    let apiPrefixWithSlash = global.sitecore.apiPrefix ? `/${global.sitecore.apiPrefix}` : "";
    app.get(`${apiPrefixWithSlash}/clientconfig.mjs`, (req, res) => {
      res.type('.js')
         .send(`export default {
            api: "${global.sitecore.apiURL}",
            site: "${global.sitecore.siteURL}",
            secure: ${global.sitecore.isSecure ? "true" : "false"},
            ws: "${global.sitecore.wsURL}",
            title: "${setup.siteTitle || "SiteCore"}",
            mods: ${JSON.stringify(global.mods)},
            menu: ${JSON.stringify(global.menu)},
            msSigninEnabled: ${setup.msSigninClientId && setup.msSigninSecret ? "true" : "false"}
          };`)
         .end()
    })
    
    app.get(`${apiPrefixWithSlash}/modroutes.mjs`, (req, res) => res.type('.js').send(global.modRoutes).end())
    
    // Load API routes
    app.use(`/${global.sitecore.apiPrefix}`, await routes());
    app.use(`/${global.sitecore.apiPrefix}`, (req, res) => {
      res.sendStatus(404);
    })
  }

  if(mode != "api"){
    for(let {id} of global.mods){
      app.use("/", express.static(join(__dirname, `../mods/${id}/www`)))
    }
    app.get("/wwwconfig.mjs", (req, res) => {
      res.type('.js')
         .send(`export default {
            api: "${global.sitecore.apiURL}",
            site: "${global.sitecore.siteURL}",
            secure: ${global.sitecore.isSecure ? "true" : "false"},
            ws: "${global.sitecore.wsURL}"
          };`)
         .end()
    })
    app.use("/", express.static(join(__dirname, "../www"), {index: "index.html"}))
    app.use("/", (req, res) => {
      if(req.query.single)
        res.sendFile(join(__dirname, "../www/index-single.html"))
      else
        res.sendFile(join(__dirname, "../www/index.html"))
    })
  }

  if(mode != "www"){
    /// catch 404 and forward to error handler
    app.use((req, res, next) => {
      const err = new Error(`Not Found: ${req.protocol + '://' + req.get('host') + req.originalUrl}`);
      err['status'] = 404;
      next(err);
    });

    /// error handlers
    app.use((err, req, res, next) => {
      /**
       * Handle 401 thrown by express-jwt library
       */
      if (err.name === 'UnauthorizedError') {
        return res
          .status(err.status)
          .send({ message: err.message })
          .end();
      }
      return next(err);
    });
    app.use((err, req, res, next) => {
      // format error
      res.status(err.status || 500).json({
        message: typeof err === "string" ? err : err.message,
        errors: err.errors,
      });
      console.log(err)
    });
  }
};