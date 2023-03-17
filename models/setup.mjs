import Entity, {query} from "entitystorage"
import { clearCache, reloadMSLogin } from "../services/mslogin.mjs"
import { unzipSync } from 'fflate';
import { mkdirp } from 'mkdirp'
import fs, {rm, promises as fsp} from "fs"
import child_process from "child_process"

export default class Setup extends Entity {
  initNew() {
    this.tag("setupcore")
  }

  static lookup() {
    return query.type(Setup).tag("setupcore").first || new Setup()
  }

  patch(obj) {
    if(typeof obj.siteTitle === "string") this.siteTitle = obj.siteTitle
    if(typeof obj.homePublic === "string") this.homePublic = obj.homePublic
    if(typeof obj.homeInternal === "string") this.homeInternal = obj.homeInternal
    if(typeof obj.msSigninClientId === "string") this.msSigninClientId = obj.msSigninClientId
    if(typeof obj.msSigninSecret === "string") this.msSigninSecret = obj.msSigninSecret
    if(typeof obj.msSigninTenant === "string") this.msSigninTenant = obj.msSigninTenant

    if(obj.msSigninClientId || obj.msSigninSecretSet || obj.msSigninTenant){
      clearCache();
      reloadMSLogin();
    }
  }

  async checkForUpdates(){
    let details = (await (await fetch(`https://api.github.com/repos/palantus/sitecore`)).json())
    this.versionAvailable = details.pushed_at
  }

  async update(){
    await this.checkForUpdates();
    let zipBuffer = await (await fetch(`https://api.github.com/repos/palantus/sitecore/zipball`)).arrayBuffer()
    
    let destPath = process.cwd();
    let zipUInt = new Uint8Array(zipBuffer);
    let decompressed = unzipSync(zipUInt)   

    let content = await fsp.readdir(process.cwd())

    let rootKey = Object.keys(decompressed)[0].split("/")[0]

    for(let file of content.filter(f => f != "node_modules" && f != ".git")){
      if(file == "mods") continue;
      if(!decompressed[`${rootKey}/${file}`] && !decompressed[`${rootKey}/${file}/`]) continue;
      //await fsp.rm(join(process.cwd(), file), {recursive: true})
      console.log(`delete ${file}`)
    }
    /*
    for (let [relativePath, content] of Object.entries(decompressed)) {
      if(relativePath.endsWith("/")) continue;
      let relPath = relativePath.split("/").slice(1).join("/")
      var outf = join(destPath, relPath);
      mkdirp.sync(dirname(outf));
      fs.writeFileSync(outf, content);
    }

    var exec = child_process.exec,child;
    child = exec('npm install', {cwd: process.cwd()}, function(err,out) { 
      console.log(out); err && console.log(err); 
    });

    this.versionInstalled = this.versionAvailable||null;
    */
    return {success: true};
  }

  toObj(){
    return {
      siteTitle: this.siteTitle||null,
      homePublic: this.homePublic||null,
      homeInternal: this.homeInternal||null,
      msSigninClientId: this.msSigninClientId||null,
      msSigninSecretSet: !!this.msSigninSecret||null,
      msSigninTenant: this.msSigninTenant||null,
      versionAvailable: this.versionAvailable||null,
      versionInstalled: this.versionInstalled||null,
    }
  }
}