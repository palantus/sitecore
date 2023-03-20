import Entity, {query}  from "entitystorage"
import { join, dirname } from 'path';
import { md2html } from "../tools/markdown.mjs";
import { unzipSync } from 'fflate';
import { mkdirp } from 'mkdirp'
import fs, {rm, promises as fsp} from "fs"
import child_process from "child_process"
import Setup from "./setup.mjs";

class Mod extends Entity {

  initNew(id) {
    if(!id) throw "id is mandatory for mods"
    this.id = id;
    this.enabled = true;
    this.installed = false;
    this.tag("sitemod")
  }

  static lookup(id){
    return query.type(Mod).tag("sitemod").prop("id", id).first
  }

  static lookupOrCreate(id){
    return Mod.lookup(id) || new Mod(id)
  }

  static all(){
    return query.type(Mod).tag("sitemod").all
  }

  static installed(){
    return query.type(Mod).tag("sitemod").prop("installed", true).all
  }

  static async checkUpdates(){
    let setup = Setup.lookup();
    let user = "palantus";
    try{
      let mods = (await (await fetch(`https://api.github.com/users/${user}/repos?per_page=1000`, {
        headers : {
          "Authorization": setup.githubAPIKey ? `token ${setup.githubAPIKey}` : undefined
        }
      })).json())
      for(let avMod of mods.filter(r => r.name.startsWith("sitemod-"))){
        let id = avMod.name.replaceAll("sitemod-", "")
        let mod = Mod.lookup(id)
        if(!mod) continue;
        mod.versionAvailable = avMod.pushed_at
      }
    } catch(err){
      console.log(err)
      throw "Failed to check for updates"
    }
  }

  get directory(){
    return join(process.cwd(), `/mods/${this.id}`)
  }

  static async refreshAvailableMods(){
    let setup = Setup.lookup();
    let user = "palantus";
    try{
      let mods = (await (await fetch(`https://api.github.com/search/repositories?q=user:${user}&per_page=1000`, {
        headers : {
          "Authorization": setup.githubAPIKey ? `token ${setup.githubAPIKey}` : undefined
        }
      })).json())
      for(let avMod of mods.items.filter(r => r.name.startsWith("sitemod-"))){
        let id = avMod.name.replaceAll("sitemod-", "")
        let mod = Mod.lookupOrCreate(id)
        mod.description = avMod.description
        mod.user = user
        mod.repo = avMod.name
        mod.versionAvailable = avMod.pushed_at
        mod.readme = await Mod.fetchReadme(user, avMod.name)
      }
    } catch(err){
      console.log(err)
      throw "Failed to refresh available mods"
    }
  }

  async refreshModVersion(){
    let setup = Setup.lookup();
    try{
      let details = (await (await fetch(`https://api.github.com/repos/${this.user}/${this.repo}`, {
        headers : {
          "Authorization": setup.githubAPIKey ? `token ${setup.githubAPIKey}` : undefined
        }
      })).json())
      this.versionAvailable = details.pushed_at
    } catch(err){
      throw "Failed to refresh mod version"
    }
  }

  static async fetchReadme(user, repo){
    let setup = Setup.lookup();
    try{
      return md2html(await (await fetch(`https://raw.githubusercontent.com/${user}/${repo}/main/README.md`, {
        headers : {
          "Authorization": setup.githubAPIKey ? `token ${setup.githubAPIKey}` : undefined
        }
      })).text())
    } catch(err){
      throw "Failed to fetch readme"
    }
  }

  async install(){
    if(this.installed) throw "Mod is already installed";
    try{
      await this.doInstall();
      this.enabled = true;
      return {success: true};
    } catch(err){
      throw err;
    }
  }

  async doInstall(){
    let setup = Setup.lookup();
    await this.refreshModVersion();
    try{
      let zipBuffer = await (await fetch(`https://api.github.com/repos/${this.user}/${this.repo}/zipball`, {
        headers : {
          "Authorization": setup.githubAPIKey ? `token ${setup.githubAPIKey}` : undefined
        }
      })).arrayBuffer()
      
      let destPath = this.directory;
      let zipUInt = new Uint8Array(zipBuffer);
      let decompressed = unzipSync(zipUInt)   

      for (let [relativePath, content] of Object.entries(decompressed)) {
        if(relativePath.endsWith("/")) continue;
        let relPath = relativePath.split("/").slice(1).join("/")
        var outf = join(destPath, relPath);
        mkdirp.sync(dirname(outf));
        fs.writeFileSync(outf, content);
      }

      var exec = child_process.exec,child;
      child = exec('npm install', {cwd: this.directory}, function(err,out) { 
        console.log(out); err && console.log(err); 
      });

      this.versionInstalled = this.versionAvailable||null;
      this.installed = true;
    } catch(err){
      throw "Failed to install mod"
    }
  }

  async update(){
    if(!this.installed) throw "Mod is not installed";
    try{
      let content = await fsp.readdir(this.directory)
      for(let file of content.filter(f => f != "node_modules" && f != ".git")){
        await fsp.rm(join(this.directory, file), {recursive: true})
      }
      await this.doInstall();
      return {success: true};
    } catch(err){
      throw err;
    }
  }

  uninstall(){
    return new Promise((resolve, reject) => rm(this.directory, {recursive: true}, err => {
      if(err) console.log(err)
      this.installed = false;
      resolve({success: true})
    }))
  }

  toObj(){
    return {
      id: this.id,
      enabled: this.enabled || false, 
      installed: !!this.installed,
      description: this.description||null,
      hasSetup: !!this.hasSetup,
      directory: this.directory,
      versionAvailable: this.versionAvailable||null,
      versionInstalled: this.installed ? this.versionInstalled||null : null,
      updateAvailable: this.versionAvailable != this.versionInstalled && this.versionAvailable && this.installed,
      github:{
        user: this.user,
        repo: this.repo
      }
    }
  }
}

export default Mod