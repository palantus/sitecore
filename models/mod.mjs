import Entity, {query}  from "entitystorage"
import { join, dirname } from 'path';
import { md2html } from "../tools/markdown.mjs";
import { unzipSync } from 'fflate';
import { mkdirp } from 'mkdirp'
import fs, {rm, promises as fsp} from "fs"
import child_process from "child_process"

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
    let user = "palantus";
    let mods = (await (await fetch(`https://api.github.com/users/${user}/repos?per_page=1000`)).json())
    for(let avMod of mods.filter(r => r.name.startsWith("sitemod-"))){
      let id = avMod.name.replaceAll("sitemod-", "")
      let mod = Mod.lookup(id)
      if(!mod) continue;
      mod.versionAvailable = avMod.pushed_at
    }
  }

  get directory(){
    return join(process.cwd(), `/mods/${this.id}`)
  }

  static async refreshAvailableMods(){
    let user = "palantus";
    let mods = (await (await fetch(`https://api.github.com/users/${user}/repos?per_page=1000`)).json())

    for(let avMod of mods.filter(r => r.name.startsWith("sitemod-"))){
      let id = avMod.name.replaceAll("sitemod-", "")
      let mod = Mod.lookupOrCreate(id)
      mod.description = avMod.description
      mod.user = user
      mod.repo = avMod.name
      mod.versionAvailable = avMod.pushed_at
      mod.readme = await Mod.fetchReadme(user, avMod.name)
    }
  }

  async refreshModVersion(){
    let details = (await (await fetch(`https://api.github.com/repos/${this.user}/${this.repo}`)).json())
    this.versionAvailable = details.pushed_at
  }

  static async fetchReadme(user, repo){
    return md2html(await (await fetch(`https://raw.githubusercontent.com/${user}/${repo}/main/README.md`)).text())
  }

  async install(){
    if(this.installed) throw "Mod is already installed";
    await this.doInstall();
    this.enabled = true;
    return {success: true};
  }

  async doInstall(){
    await this.refreshModVersion();
    let zipBuffer = await (await fetch(`https://api.github.com/repos/${this.user}/${this.repo}/zipball`)).arrayBuffer()
    
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
    return {success: true};
  }

  async update(){
    if(!this.installed) throw "Mod is not installed";
    let content = await fsp.readdir(this.directory)
    for(let file of content.filter(f => f != "node_modules" && f != ".git")){
      await fsp.rm(join(this.directory, file), {recursive: true})
    }
    await this.doInstall();
    return {success: true};
  }

  uninstall(){
    return new Promise((resolve, reject) => rm(this.directory, {recursive: true}, err => {
      console.log(err)
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
      updateAvailable: this.versionAvailable != this.versionInstalled && this.versionAvailable && this.installed
    }
  }
}

export default Mod