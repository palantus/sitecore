import Entity, {query}  from "entitystorage"
import { simpleGit } from 'simple-git';
import { join } from 'path';

class Mod extends Entity {

  initNew(id) {
    if(!id) throw "id is mandatory for mods"
    this.id = id;
    this.enabled = true;
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

  async update(){
    let result = await this.loadGit().pull()
    await this.refreshVersion();
    this.updateAvailable = false;
    return result
  }

  async checkUpdates(){
    await this.loadGit().fetch();
    let result = await this.loadGit().status({"-uno": null})
    this.updateAvailable = result?.behind > 0
  }

  async refreshVersion(){
    let result = await this.loadGit().revparse({"--short": null, "HEAD": null})
    if(typeof result === "string" && result.length < 50){
      this.version = result;
    } else {
      this.version = null;
    }
  }

  loadGit(){
    return simpleGit({
      baseDir: this.directory,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    });
  }

  get directory(){
    return join(process.cwd(), `/mods/${this.id}`)
  }

  toObj(){
    return {
      id: this.id,
      enabled: this.enabled || false, 
      hasSetup: !!this.hasSetup,
      directory: this.directory,
      version: this.version||null,
      updateAvailable: !!this.updateAvailable
    }
  }
}

export default Mod