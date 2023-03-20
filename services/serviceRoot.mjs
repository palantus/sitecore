import Role from "../models/role.mjs";
import auth from "./auth.mjs"
import { startCleanupService } from "./cleanup.mjs";
import fs from 'fs'
import path from "path";

export default async () => {

  Role.lookupOrCreate("federation").addPermission(["user.federate"], true)

  let services = {
    auth: auth.init(),
    cleanup: startCleanupService()
  }

  for(let {id : mod} of global.mods){
    if(!(await rootExists(`./mods/${mod}`))) {
      continue;
    }
    let modServices = (await import(`../mods/${mod}/services.mjs`)).default;
    Object.assign(services, modServices())
  }

  return services
}

async function rootExists(basePath){
  return new Promise(r => fs.access(path.join(basePath, "services.mjs"), fs.F_OK, (err) => {
    if (err) return r(false);
    return r(true)
  }))
}