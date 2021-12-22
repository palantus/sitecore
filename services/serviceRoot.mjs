
export default async () => {
  let services = {}

  for(let {id : mod} of global.mods){
    let modServices = (await import(`../mods/${mod}/services.mjs`)).default;
    Object.assign(services, modServices)
  }

  return services
}