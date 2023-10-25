import express from 'express';
//import bodyParser from 'body-parser';
import cors from 'cors';
import routes from '../api/index.mjs';
//import cookieParser from 'cookie-parser';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fileUpload from 'express-fileupload';
import Setup from '../models/setup.mjs';
import Remote from '../models/remote.mjs';
import { loadFilesList, staticRoute } from './static.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
let indexFileCache;

export default async ({ app, mode, config }) => {

  if(mode != "www"){
    // Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
    // It shows the real origin IP in the heroku or Cloudwatch logs
    app.enable('trust proxy');

    // The magic package that prevents frontend developers going nuts
    // Alternate description:
    // Enable Cross Origin Resource Sharing to all origins by default
    const corsOptions = {
      credentials: true,
      origin: function (origin, callback) {
        callback(null, true)
      },
      maxAge: 86400 //Enable OPTIONS caching
    }
    //Don't enable cors here, because it can conflict with certain mods (eg. files using webdav-server)
    //app.use(cors());
   
    app.use(fileUpload({defParamCharset: "utf8"}));
    app.use(express.json({limit: '50mb'}));
    app.use(express.text());
    app.use(express.urlencoded({ extended: false }));
    //app.use(cookieParser());
    
    let setup = Setup.lookup()
    let apiPrefixWithSlash = global.sitecore.apiPrefix ? `/${global.sitecore.apiPrefix}` : "";
    app.get(`${apiPrefixWithSlash}/clientconfig`, cors(corsOptions), (req, res) => {
      res.json({
            title: setup.siteTitle || "SiteCore",
            mods: global.mods,
            menu: global.menu,
            msSigninEnabled: setup.msSigninClientId && setup.msSigninSecret ? "true" : "false",
            homePublic: setup.homePublic || null,
            homeInternal: setup.homeInternal || null
          })
    })
    
    app.get(`${apiPrefixWithSlash}/modroutes.mjs`, cors(corsOptions), (req, res) => res.type('.js').send(global.modRoutes).end())
    
    // Load API routes
    let apiRouter = await routes(app)

    if(global.sitecore.apiHost != global.sitecore.siteHost){
      // Handle when api is hosted on a separate subdomain/port
      app.use(cors(corsOptions), (req, res, next) => {
        if(req.headers.host == global.sitecore.apiHost){
          return apiRouter(req, res, next)
        } else {
          return next()
        }
      })
    } else {
      app.use(`/${global.sitecore.apiPrefix}`, cors(corsOptions), apiRouter);
      app.use(cors(corsOptions))
      app.use(`/${global.sitecore.apiPrefix}`, (req, res) => {
        res.sendStatus(404);
      })
    }
  }

  if(mode != "api"){
    await loadFilesList();

    app.get("/wwwconfig", (req, res) => {
      res.json({
            api: global.sitecore.apiURL,
            site: global.sitecore.siteURL,
            secure: global.sitecore.isSecure ? true : false,
            ws: global.sitecore.wsURL
          })
    })
    app.get("/_:remote/wwwconfig", (req, res) => {
      if(!Remote.lookupIdentifier(req.params.remote)) return res.sendStatus(404);
      res.json({
            api: `${global.sitecore.apiURL}/federation/${req.params.remote}/api`,
            site: `${global.sitecore.siteURL}/_${req.params.remote}`,
            secure: global.sitecore.isSecure ? true : false,
            ws: `${global.sitecore.apiURL}/federation/${req.params.remote}/api`
          })
    })
    app.use("/", staticRoute)
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