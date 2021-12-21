let elementName = "field-edit"

import api from "../system/api.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host{display: inline-block;}
    #options{display: none;}
    input:not([type='checkbox']), select{
      width: 100%;
    }
  </style>
  <span class="field">
      <input></input>
      <select></select>
      <span id="options">
        <slot></slot>
      </span>
      <datalist id="lookuplist"></datalist>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.valueChanged = this.valueChanged.bind(this)
  }

  async connectedCallback() {
    this.querySelectorAll("option")?.forEach(e => {
      this.shadowRoot.querySelector("select").appendChild(e)
    })

    this.refresh();
    let value = this.getAttribute("value")
    if(value !== null && value !== undefined){
      this.setValue(value)
    }

    let lookup = this.getAttribute("lookup");
    if(lookup){
      switch(lookup){
        case "tags":
          this.shadowRoot.getElementById("lookuplist").innerHTML = (await api.get("tags/simple")).map(t => `<option value="${t}">${t}</option>`).join("")
          break;
        case "servers":
          this.shadowRoot.getElementById("lookuplist").innerHTML = (await api.get("server")).map(s => `<option value="${s.id}">${s.id}</option>`).join("")
          break;
        case "runbooks":
          this.shadowRoot.getElementById("lookuplist").innerHTML = (await api.get("runbooks")).sort((a, b) => a.title < b.title ? -1 : 1).map(s => `<option value="${s.id}">${s.title}</option>`).join("")
          break;
        case "users":
          this.shadowRoot.getElementById("lookuplist").innerHTML = (await api.get("user/list")).sort((a, b) => a.id < b.id ? -1 : 1).map(s => `<option value="${s.id}">${s.name}</option>`).join("")
          break;
      }
      this.shadowRoot.querySelector("input").setAttribute("list", "lookuplist")
    }

    this.shadowRoot.querySelectorAll("select,input").forEach(e => e.addEventListener("change", this.valueChanged))
  }

  async valueChanged(e){
    if(this.preventSaving) return;
    
    let patch = this.getAttribute("patch")
    let field = this.getAttribute("field") || this.getAttribute("id")
    if(!patch || !field) return;

    let value = this.getValue();
    if(value === undefined) return;

    let patchObj = {}
    patchObj[field] = value;

    this.setAttribute("value", value)
    await api.patch(patch, patchObj)

    this.dispatchEvent(new CustomEvent("value-changed", {bubbles: false, cancelable: false}));
  }

  getValue(){
    switch(this.getAttribute("type")){
        case "text":
        case "password":
        case "date":
          return this.shadowRoot.querySelector("input").value;
        case "number":
          return parseFloat(this.shadowRoot.querySelector("input").value);
        case "select":
          return this.shadowRoot.querySelector("select").value;
        case "checkbox":
          return this.shadowRoot.querySelector("input").matches(":checked");
    }
    return undefined;
  }

  disconnectedCallback() {
  }

  refresh(){
    if(this.getAttribute("type") == "select"){
      this.shadowRoot.querySelector("input").style.display = "none"
      this.shadowRoot.querySelector("select").style.display = "block"
      
      this.shadowRoot.querySelector("select").toggleAttribute("disabled", this.hasAttribute("disabled"))
    } else {
      this.shadowRoot.querySelector("input").style.display = "block"
      this.shadowRoot.querySelector("select").style.display = "none"
      
      this.shadowRoot.querySelector("input").setAttribute("type", this.getAttribute("type"));
      this.shadowRoot.querySelector("input").toggleAttribute("disabled", this.hasAttribute("disabled"))
    }
  }
  
  setValue(newValue){
    this.preventSaving = true;
    switch(this.getAttribute("type")){
      case "checkbox":
        this.shadowRoot.querySelector("input").toggleAttribute("checked", newValue !== "false" && newValue !== false);
        break;
      case "text":
      case "password":
      case "date":
      case "number":
        this.shadowRoot.querySelector("input").value = newValue;
        break;
      case "select":
        this.shadowRoot.querySelector("select").value = newValue;
        break;
    }
    this.preventSaving = false;
  }

  static get observedAttributes() {
    return ["value", "type", "disabled"];
  }  

  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "value":
        if(newValue != oldValue) {
          this.setValue(newValue)
        }
        break;
      case "type":
      case "disabled":
        this.refresh();
        break;
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}