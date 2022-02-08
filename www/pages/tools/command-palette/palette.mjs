const elementName = 'cmd-palette-component'

import {getCommands} from "./commands.mjs"
import {userRoles, userPermissions} from "/system/user.mjs";

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{
      position: fixed;
      display: none;
      left:0px;
      top:0px;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 200;
    }
    .visible{
      display: block !important;
    }
    #center{
      margin: auto;
      width: 500px;
      margin-top: 50px;
    }
    input{
      width: 100%;
      height: 30px;
      font-size: 120%;
      border-radius: 10px;
      border: none;
      padding: 7px;
      box-shadow: 2px 2px 15px black;
    }
    #commands{
      color: white;
      margin-top: 20px;
    }
    div.command{

    }
    div.command span{
      display: inline-block;
      width: 15px;
    }

    div.command.selected span::after{
      content: ">"
    }
  </style>
  <div id="container">
    <div id="center">
      <input id="command" type="text" placeholder="Enter command"></input>
      <div id="commands">
      </div>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.keypressDocument = this.keypressDocument.bind(this)
    this.keypressCommand = this.keypressCommand.bind(this)
    this.bgClick = this.bgClick.bind(this)
    this.onInput = this.onInput.bind(this)

    this.context = {}
  }

  keypressCommand(e){
    switch(e.which){
      case 38: //UP
        this.prevCommand();
        e.preventDefault();
        break;
      case 40: //DOWN
        this.nextCommand();
        e.preventDefault();
        break;
      case 13: //ENTER
        this.runSelected();
        e.preventDefault();
        break;
    }
    return true;
  }

  keypressDocument(e){
    switch(e.which){
      case 112: //F1
        this.toggle();
        e.preventDefault()
        break;
      case 27: //ESC
        this.toggle(false);
        e.preventDefault()
        break;
    }
  }

  bgClick(e){
    if(e.target.id != "container" && e.target.id != "center") return;
    this.toggle();
  }

  async toggle(forceValue){
    let container = this.shadowRoot.getElementById("container");
    container.classList.toggle("visible", forceValue)
    if(container.classList.contains("visible")){
      this.shadowRoot.querySelector("input").focus()
      this.context = {userRoles: await userRoles(), userPermissions: await userPermissions()}
    }
  }

  nextCommand(){
    let selected = this.shadowRoot.querySelector("div.command.selected");
    if(selected.nextSibling){
      selected.nextSibling.classList.toggle("selected")
      selected.classList.toggle("selected")
    }
  }

  prevCommand(){
    let selected = this.shadowRoot.querySelector("div.command.selected");
    if(selected.previousSibling){
      selected.previousSibling.classList.toggle("selected")
      selected.classList.toggle("selected")
    }
  }

  async onInput(e){
    this.commands = await getCommands(this.context, e.target.value)
    this.shadowRoot.getElementById("commands").innerHTML = this.commands.map(c => `<div class="command"><span></span>${c.title||c.constructor.title}</div>`).join("")
    this.shadowRoot.querySelector("div.command:first-child")?.classList.add("selected")
  }

  async runSelected(){
    let selected = this.shadowRoot.querySelector("div.command.selected");
    if(!selected) return;
    const index = [...selected.parentElement.children].indexOf(selected);
    let cmd = this.commands[index];
    if(cmd){
      await cmd.run();
      this.toggle()
      this.shadowRoot.getElementById("command").value = ""
      this.shadowRoot.getElementById("commands").innerHTML = ""
    }
  }

  connectedCallback() {
    document.addEventListener("keydown", this.keypressDocument)
    this.shadowRoot.getElementById("container").addEventListener("click", this.bgClick)
    this.shadowRoot.getElementById("command").addEventListener("input", this.onInput)
    this.shadowRoot.getElementById("command").addEventListener("keydown", this.keypressCommand)
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}