import {goto, menu} from "/system/core.mjs"
import {Command, removeKeywordsFromQuery} from "../command.mjs"

export class OpenMenuItem extends Command{
  static menuItems = [];

  static keywords = [
    {words: ["goto", "menu", "go"], mandatory: false}
  ]

  static createInstances(context){
    let query = removeKeywordsFromQuery(context.query, this.keywords)

    if(this.menuItems.length < 1){
      for(let subMenu of menu){
        for(let item of subMenu.items){
          this.menuItems.push({
            menu: subMenu.title,
            title: item.title,
            path:  item.path
          })
        }
      }
    }

    return this.menuItems.filter(mi => {
      for(let word of query){
        if(mi.menu.toLowerCase().includes(word))
          continue;
        if(mi.title.toLowerCase().includes(word))
          continue;
        return false;
      }
      return true;
    })
    .map(mi => {
      let cmd = new OpenMenuItem()
      cmd.context = context;
      cmd.path = mi.path
      cmd.title = `Goto: ${mi.menu} -> ${mi.title}`
      return cmd
    })
  }

  async run(){
    goto(this.path)
  }
}