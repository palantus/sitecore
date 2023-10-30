import glob from 'glob-promise';
import { promises as fs } from "fs";
import mime from 'mime-types'
import {createHash} from "crypto"
import Remote from '../models/remote.mjs';
import Setup from '../models/setup.mjs';
import url from "url"

let virtualPathToPhysical = new Map();
let virtualPathsAvailable = new Set()
let virtualPathToContent = new Map()
let virtualPathToHash = new Map()

export async function loadFilesList(){
  // Load mod files:
  for(let mod of global.mods){
    let files = (await glob(`mods/${mod.id}/www/**/*.*`))
    let modPathLength = `mods/${mod.id}/www`.length;
    for(let filePath of files){
      let virtualPath = filePath.substring(modPathLength);
      if(virtualPathsAvailable.has(virtualPath)) continue;
      virtualPathsAvailable.add(virtualPath)
      virtualPathToPhysical.set(virtualPath, filePath);
    }
  }

  // Load core files:
  let files = (await glob(`www/**/*.*`))
  for(let filePath of files){
    let virtualPath = filePath.substring(3);
    if(virtualPathsAvailable.has(virtualPath)) continue;
    virtualPathsAvailable.add(virtualPath)
    virtualPathToPhysical.set(virtualPath, filePath);
  }
}

export async function staticRoute(req, res, next){
  let path = req.path;
  if(path.startsWith("/_")){
    return serveFromRemote(req, res, req.path.split("/")[1].substring(1))
  }

  if(!virtualPathsAvailable.has(path)){
    if(req.method == "GET" || req.method == "HEAD"){
      // Return index
      let pathLevel = path.split("/").length-2;
      path = `/index_${pathLevel}${req.query.single?"-single":''}.html`;
      if(!virtualPathToContent.has(path)){
        await loadIndex(path, pathLevel, !!req.query.single);
      }
    } else {
      return res.sendStatus(404);
    }
  }

  if(!virtualPathToContent.has(path)){
    // Load file
    let physicalPath = virtualPathToPhysical.get(path);
    let data = await fs.readFile(physicalPath);
    let buffer = Buffer.from(data);
    virtualPathToContent.set(path, buffer);
    
    let hash = createHash('md5').update(buffer).digest("base64");
    virtualPathToHash.set(path, hash);
  }

  let content = virtualPathToContent.get(path);
  let hash = virtualPathToHash.get(path)

  res.setHeader('Content-Type', mime.lookup(path))
  res.setHeader('Cache-Control', `max-age=31536000, no-cache`)
  res.setHeader('Vary', 'ETag, Content-Encoding')
  let ifNoneMatchValue = req.headers['if-none-match']
  res.setHeader('ETag', hash)

  if (ifNoneMatchValue && ifNoneMatchValue === hash) {
    res.setHeader('Content-Length', '0')
    res.sendStatus(304); // Content is cached, don't return a body
  } else if (req.method.toLowerCase() === 'head') {
    res.setHeader('Content-Length', '0')
    res.sendStatus(200); // This was a head request, don't send the actual bytes.
  } else {
    res.setHeader('Content-Length', ''+content.length)
    res.end(content)
  }
}

// Note that this is intended for static content, but for servers where the API is served at /api/, it will work for API as well
// It is recommended to use /federation/myremote/api instead for API calls, because it will work regardless of where the api is hosted.
async function serveFromRemote(req, res, remoteId){
  let path = decodeURI(req.path.split("/").slice(2).join("/")) // Go from eg. "/_test/setup/users" to "setup/users"
  let remote = Remote.lookupIdentifier(remoteId)
  if(!remote) {
    if(Setup.lookup().identifier == remoteId) {
      let redirectUrl = url.format({pathname: `/${path}`, query: req.query});
      return res.redirect(redirectUrl);
    } else {
      return res.sendStatus(404);
    }
  }
  try{
    let query = req.query;
    delete query.token;
    delete query.impersonate;
    let redirectUrl = url.format({pathname: path, query});
    let customHeaders = {
      "if-none-match": req.headers['if-none-match'] || undefined
    }
    let response = await remote.get(redirectUrl, {returnRaw: true, ignoreErrors: true, useSiteURL: true, useGuest: true, customHeaders})
    let headers = {} // Don't try to set the headers below to null or undefined, to "not set them". It won't work.
    if(response.headers?.get("Content-Disposition")) headers["Content-Disposition"] = response.headers.get("Content-Disposition");
    if(response.headers?.get("Content-Type")) headers["Content-Type"] = response.headers.get("Content-Type");
    if(response.headers?.get("Content-Length")) headers["Content-Length"] = response.headers.get("Content-Length");
    if(response.headers?.get("Cache-Control")) headers["Cache-Control"] = response.headers.get("Cache-Control");
    if(response.headers?.get("Vary")) headers["Vary"] = response.headers.get("Vary");
    if(response.headers?.get("ETag")) headers["ETag"] = response.headers.get("ETag");
    if(response.headers?.get("share-key")) headers["share-key"] = response.headers.get("share-key");
    res.writeHead(response.status, headers)
    response.body.pipe(res)
  } catch(err) {
    console.log(`Could not get ${path} on ${remote.identifier} from remote ${remote.title}`)
    console.log(err)
    res.sendStatus(500)
  }
}

/* 
  Loading index for a specific level. 
  This causes index imports to be updated to reflect how many times it should "go back" to get to the current root 
*/
async function loadIndex(path, level, isSingle){
  let physicalPath = virtualPathToPhysical.get(isSingle ? "/index-single..html" : "/index.html");
  let indexContent = await fs.readFile(physicalPath, "utf8");

  let newRelativePath = "../".repeat(level);

  indexContent = indexContent.replaceAll(`src="/`, `src="${newRelativePath}`)
                             .replaceAll(`href="/`, `src="${newRelativePath}`)

  let buffer = Buffer.from(indexContent);
  virtualPathToContent.set(path, buffer);
  
  let hash = createHash('md5').update(buffer).digest("base64");
  virtualPathToHash.set(path, hash);
}