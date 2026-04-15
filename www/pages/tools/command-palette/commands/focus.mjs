import {pageElement} from "../../../../system/core.mjs"
import {Command, removeKeywordsFromQuery} from "../command.mjs"

export class Focuser extends Command{
  static keywords = [
    {words: ["fucus", "f"], mandatory: false}
  ]

  static createInstances(context){
    let query = removeKeywordsFromQuery(context.query, this.keywords)

    let elements = queryShadowRootsRecursive("field-ref", pageElement().shadowRoot);
    if(!elements) return [];

    return [...elements]
    .filter(i => i.innerText.length > 2 && i.localName == "field-ref")
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
      let cmd = new Focuser()
      cmd.context = context;
      cmd.elementReference = mi.element;
      cmd.title = `Focus: ${mi.title}`
      return cmd
    })
  }

  async run(){
    this.elementReference.focus();

  }

}

function queryShadowRootsRecursive(selector, root){
  let nodes = Array.from(root.querySelectorAll(selector));

  // Find all elements that have a shadow root
  const hosts = root.querySelectorAll(':not(:defined), [id*="-"], *');
  
  hosts.forEach(el => {
    if(!el.shadowRoot) return;
  
    // Recursively search the shadow root
    nodes = nodes.concat(queryShadowRootsRecursive(selector, el.shadowRoot));
  });
  
  return nodes;
}
