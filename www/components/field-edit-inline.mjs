let elementName = "field-edit-inline"

import { stylesheets } from "../system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host{}
    #text{cursor: pointer;}
  </style>
  <span class="container">
    <span id="text" class="highlight"></span>
    <field-edit class="hidden"></field-edit>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global]
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.updateText = this.updateText.bind(this);

    this.fieldEdit = this.shadowRoot.querySelector("field-edit")

    this.getValue = this.fieldEdit.getValue;
    this.setValue = this.fieldEdit.setValue;
    this.focus = this.fieldEdit.focus;
    this.select = this.fieldEdit.select;

    if(this.getAttribute("type") == "select"){
      this.querySelectorAll("option")?.forEach(e => {
        this.fieldEdit.appendChild(e)
      })
      this.fieldEdit.refresh();
    }

    this.addEventListener("focus", this.fieldEdit.focus);
    this.fieldEdit.addEventListener("value-changed", () => {
      this.setEditMode(false)
      this.dispatchEvent(new CustomEvent("value-changed", {bubbles: false, cancelable: false}))
    });
    this.fieldEdit.addEventListener("failed-patch", () => this.dispatchEvent(new CustomEvent("failed-patch", {bubbles: false, cancelable: false})));
    this.fieldEdit.addEventListener("focusout", () => {
      if(this.hasAttribute("edit")) return;
      this.setEditMode(false)
    })

    this.shadowRoot.getElementById("text").addEventListener("click", () => this.setEditMode(true, true))
  }

  updateText(){
    this.shadowRoot.getElementById("text").innerText = this.fieldEdit.getValueTitle() || "<empty>";
  }

  static get observedAttributes() {
    return ["value", "type", "disabled", "lookup", "patch", "field", "id", "label", "min", "max", "rows", "cols", "edit"];
  }  

  attributeChangedCallback(name, oldValue, newValue) {
    if(name == "edit"){
      this.setEditMode(newValue !== null)
    } else {
      this.fieldEdit.setAttribute(name, newValue)
    }
    this.updateText()
  }

  setEditMode(edit, setFocus = false){
    this.fieldEdit.classList.toggle("hidden", !edit)
    this.shadowRoot.getElementById("text").classList.toggle("hidden", edit)
    if(edit && setFocus) this.fieldEdit.focus();
    if(!edit) this.updateText();
  }

  connectedCallback() {

  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}