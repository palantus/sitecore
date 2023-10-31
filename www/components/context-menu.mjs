let elementName = "context-menu"

/*
  Usage:
  let container = document.createElement("collapsible-card")
  container.innerHTML = `
    <span slot="title">${spec.name}</span>
    <context-menu width="150px">
      <span data-button="remove">Remove data source</span>
      <span data-button="toggle-edit">Toggle edit mode</span>
    </context-menu>
  `

  Either listen directly on the element for "item-clicked" or on a parent element with class "container".

  this.shadowRoot.getElementById("....").addEventListener("item-clicked", e => {
    let menu = e.detail.menu
    switch(e.detail.button){
      case "remove":
        //...
        break;
      //...
    }
  }
*/

import "../components/dropdown-menu.mjs"
import { stylesheets } from "../system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #title{
      border-bottom: 1px solid var(--contrast-color-muted);
      margin: 0px;
      margin-bottom: 5px;
    }
    #items > button{
      display: block;
      background: none;
      color: inherit;
      border: none;
      padding: 0;
      font: inherit;
      cursor: pointer;
      outline: inherit;
      width: 100%;
      text-align: left;
      padding-top: 2px;
      padding-left: 2px;
    }
    #items > button:hover{
      background-color: var(--table-hover);
    }
  </style>

  <dropdown-menu-component class="options" title="Options" >
      <span slot="label" tabindex="0">&vellip;</span>
      <div slot="content">
        <p id="title" class="hidden">Test</p>
        <div id="items">
        </div>
      </div>
  </dropdown-menu-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global]
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.dropMenu = this.shadowRoot.querySelector("dropdown-menu-component")

    this.shadowRoot.getElementById("items").innerHTML = [...this.querySelectorAll("span")].map(e => `<button data-button="${e.getAttribute("data-button")}">${e.innerText}</button>`).join("")
    this.shadowRoot.getElementById("items").addEventListener("click", e => {
      if(e.target.tagName !== "BUTTON") return;
      let data = {
        bubbles: false, 
        cancelable: true, 
        detail: {
          button: e.target.getAttribute("data-button"),
          menu: this
        }
      }
      this.dispatchEvent(new CustomEvent("item-clicked", data))
      this.closest(".container")?.dispatchEvent(new CustomEvent("item-clicked", data))
    })
  }

  static get observedAttributes() {
    return ["width", "title"];
  }  

  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "title":
        this.shadowRoot.getElementById("title").innerText = newValue
        this.shadowRoot.getElementById("title").classList.toggle("hidden", !newValue)
        break;
      default:
        this.dropMenu.setAttribute(name, newValue)
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}