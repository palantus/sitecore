const elementName = 'rightbar-component'

import "./user.mjs"
import "./notifications.mjs"
import "../../components/field-ref.mjs"
import "../../components/field.mjs"
import {isMobile} from "/system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
  </style>
  <div id="container">
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.setPage = this.setPage.bind(this)
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }

  setAttributeOnComponent(name, value){
    this.shadowRoot.getElementById("container").firstChild?.setAttribute(name, value)
  }

  setArgs(args){
    for(let [name, value] of args){
      this.setAttributeOnComponent(name, value)
    }
    this._args = args
  }

  async setPage(pageId, args = []){
    this.setAttribute("page", pageId)
    this._args = args
    return new Promise(resolve => {
      this.shadowRoot.querySelectorAll("#container .item").forEach(e => e.style.display = "none")
      document.getElementById("grid-container").classList.add("rightvisible");
      if(isMobile()){
        document.getElementById("grid-container").classList.add("collapsed")
      }
      this.shadowRoot.getElementById("container").innerHTML = "";
      import(`/pages/rightbar/${pageId}.mjs`).then(() => {
        let componentName = `rightbar-${pageId}-component`;
        let element = document.createElement(componentName)
        for(let [name, value] of args){
          element.setAttribute(name, value)
        }
        this.shadowRoot.getElementById("container").appendChild(element)
        element.classList.add("item")
        element.style.display = "block"
        element.dispatchEvent(new CustomEvent("opened", {bubbles: true, cancelable: false}));
        resolve();
      })
    })
  }

  hidePage(){
    document.getElementById("grid-container").classList.remove("rightvisible");
    this.shadowRoot.getElementById("container").innerHTML = "";
    this.setAttribute("page", "")
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}

export let toggleInRightbar = (pageId, force, args) => {
  if(!pageId) return;
  let rightBar = document.querySelector("#grid-container .right rightbar-component");
  let differentPage = rightBar.getAttribute("page") != pageId
  let differentArgs = args && JSON.stringify(args) != JSON.stringify(rightBar._args)
  if(!differentPage && differentArgs) showInRightbar(pageId, args, true)
  else if(differentPage) showInRightbar(pageId, args)
  else rightBar.hidePage()
}

export let showInRightbar = async (pageId, args, useExistingIfAvailable = false) => {
  if(!pageId) return;
  let rightBar = document.querySelector("#grid-container .right rightbar-component");
  if(!useExistingIfAvailable || rightBar.getAttribute("page") != pageId){
    await rightBar.setPage(pageId, args)
  } else {
    rightBar.setArgs(args)
  }
}

export let closeRightbar = (pageId, args) => {
  let rightBar = document.querySelector("#grid-container .right rightbar-component");
  rightBar.hidePage()
}
export let updateRightbarArgs = (pageId, args) => {
  if(!pageId) return;
  let rightBar = document.querySelector("#grid-container .right rightbar-component");
  if(rightBar.getAttribute("page") != pageId) return;
  let differentArgs = args && JSON.stringify(args) != JSON.stringify(rightBar._args)
  if(!differentArgs) return;
  showInRightbar(pageId, args, true)
}