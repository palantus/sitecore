import {pageElement} from "../../../../system/core.mjs"
import {Command, removeKeywordsFromQuery} from "../command.mjs"

export class ActionBarClicker extends Command{
  static menuItems = [];

  static keywords = [
    {words: ["click", "action"], mandatory: false}
  ]

  static createInstances(context){
    let query = removeKeywordsFromQuery(context.query, this.keywords)

    let actionBar = pageElement().shadowRoot.querySelector("action-bar");
    if(!actionBar) return [];

    return [...actionBar.querySelectorAll("action-bar-item")]
    .map(i => ({
        title: i.innerText, 
        element: i
      }))
    .filter(mi => {
      for(let word of query){
        if(mi.title.toLowerCase().includes(word))
          continue;
        return false;
      }
      return true;
    })
    .map(mi => {
      let cmd = new ActionBarClicker()
      cmd.context = context;
      cmd.elementReference = mi.element;
      cmd.title = `Click: ${mi.title}`
      return cmd
    })
  }

  async run(){
    this.elementReference.click();

  }
}
