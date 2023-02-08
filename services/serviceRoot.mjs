import Role from "../models/role.mjs";
import auth from "./auth.mjs"
import { startCleanupService } from "./cleanup.mjs";

export default async () => {

  Role.lookupOrCreate("federation").addPermission(["user.federate"], true)

  let services = {
    auth: auth.init(),
    cleanup: startCleanupService()
  }

  for(let {id : mod} of global.mods){
    let modServices = (await import(`../mods/${mod}/services.mjs`)).default;
    Object.assign(services, modServices())
  }

  return services
}