import {mods} from "../../../system/core.mjs"

let commands = []
let commandsPromise = null;

export let getCommands = async (context, query) => {
  if(commandsPromise) await commandsPromise

  if(commands.length == 0){

    let commandFiles = [import("./commands/menu.mjs")]

    for(let mod of mods()){
      commandFiles.push(...mod.files.filter(f => f.startsWith("/commands/")).map(f => import(f)))
    }

    commandsPromise = Promise.all(commandFiles)
    let commandsImport = await commandsPromise;

    for(let imp of commandsImport){
      for(let cmdName in imp){
        let cmd = imp[cmdName]
        if(typeof cmd.preload === "function"){
          cmd.preload(context);
        }
        commands.push(cmd)
      }
    }
  }
  let queryArray = query.split(" ")
  context.query = queryArray

  return commands.filter(cmd => {
    for(let keyword of cmd.keywords||[]){
      if(keyword.mandatory && (keyword.words||[keyword.word]).filter(w => queryArray.includes(w)).length < 1){
        return false;
      }
    }
    return true;
  }).map(cmd => {
    return cmd.createInstances(context)
  }).flat().map(cmd => {
    cmd.priority = 0;
    for(let keyword of cmd.constructor.keywords||[]){
      if((keyword.words||[keyword.word]).filter(w => queryArray.includes(w)).length > 0){
        cmd.priority += keyword.priority ?? (keyword.mandatory ? 3 : 1)
      }
    }
    return cmd;
  }).sort((a, b) => b.priority - a.priority)
}