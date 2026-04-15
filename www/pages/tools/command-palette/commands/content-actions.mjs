import {pageElement} from "../../../../system/core.mjs"
import {Command, removeKeywordsFromQuery} from "../command.mjs"

export class ContentFocuser extends Command{
  static keywords = [
    {words: ["fucus", "f"], mandatory: false}
  ]

  static createInstances(context){
    let query = removeKeywordsFromQuery(context.query, this.keywords)

    let elements = queryShadowRootsRecursive("field-edit", pageElement().shadowRoot);

    let rightPane = document.querySelector("#grid-container rightbar-component");
    if(rightPane && rightPane.getAttribute("page")){
      elements = [...elements, ...queryShadowRootsRecursive("field-edit", rightPane.shadowRoot)];
    }

    return [...elements]
    .filter(i => !i.hasAttribute("disabled") && i.getAttribute("label"))
    .map(i => ({
        title: i.getAttribute("label"), 
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
      let cmd = new ContentFocuser()
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

export class FieldRefClicker extends Command{
  static keywords = [
    {words: ["ref"], mandatory: false}
  ]

  static createInstances(context){
    let query = removeKeywordsFromQuery(context.query, this.keywords)

    let elements = queryShadowRootsRecursive("field-ref", pageElement().shadowRoot);

    let rightPane = document.querySelector("#grid-container rightbar-component");
    if(rightPane && rightPane.getAttribute("page")){
      elements = [...elements, ...queryShadowRootsRecursive("field-ref", rightPane.shadowRoot)];
    }

    return [...elements]
    .filter(i => i.innerText.length > 2)
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
      let cmd = new FieldRefClicker()
      cmd.context = context;
      cmd.elementReference = mi.element;
      cmd.title = `Follow reference: ${mi.title}`
      return cmd
    })
  }

  async run(){
    this.elementReference.click();
  }
}

export class ButtonClicker extends Command{
  static keywords = [
    {words: ["ref"], mandatory: false}
  ]

  static createInstances(context){
    let query = removeKeywordsFromQuery(context.query, this.keywords)

    let elements = queryShadowRootsRecursive("button", pageElement().shadowRoot);

    let rightPane = document.querySelector("#grid-container rightbar-component");
    if(rightPane && rightPane.getAttribute("page")){
      elements = [...elements, ...queryShadowRootsRecursive("button", rightPane.shadowRoot)];
    }

    return [...elements]
    .filter(i => i.innerText.length > 2)
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
      let cmd = new FieldRefClicker()
      cmd.context = context;
      cmd.elementReference = mi.element;
      cmd.title = `Click button: ${mi.title}`
      return cmd
    })
  }

  async run(){
    this.elementReference.click();
  }
}

export class BackCommand extends Command{
  static keywords = [
    {words: ["back", "b"], mandatory: true}
  ]

  static createInstances(context){
    let cmd = new BackCommand()
    cmd.context = context;
    cmd.title = `Go back in history`
    return [cmd];
  }

  async run(){
    window.history.back();
  }
}

export class ForwardCommand extends Command{
  static keywords = [
    {words: ["forward", "fwd"], mandatory: true}
  ]

  static createInstances(context){
    let cmd = new ForwardCommand()
    cmd.context = context;
    cmd.title = `Go forward in history`
    return [cmd];
  }

  async run(){
    window.history.forward();
  }
}

function queryShadowRootsRecursive(selector, root){
  let nodes = Array.from(root.querySelectorAll(selector));

  // Find all elements that have a shadow root
  const hosts = root.querySelectorAll(':not(:defined), [id*="-"], *');
  
  hosts.forEach(el => {
    if(!el.shadowRoot) return;
    if(el.hasAttribute("hidden") || el.classList.contains("hidden") || el.hasAttribute("disabled")) return;
    if(el.localName == "dialog-component" && !el.classList.contains("open")) return;
 
    // Recursively search the shadow root
    nodes = nodes.concat(queryShadowRootsRecursive(selector, el.shadowRoot));
  });
  
  return nodes;
}
