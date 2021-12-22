import auth from "./auth.mjs"

export default async () => {
  let services = {
    auth: auth.init()
  }

  for(let {id : mod} of global.mods){
    let modServices = (await import(`../mods/${mod}/services.mjs`)).default;
    Object.assign(services, modServices())
  }

  return services
}