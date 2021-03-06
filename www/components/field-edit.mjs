let elementName = "field-edit"

import api from "/system/api.mjs"
import {userPermissions} from "/system/user.mjs"
import { fire } from "../system/events.mjs";

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host{display: inline-block;}
    #options{display: none;}
    input:not([type='checkbox']), select{
      width: 100%;
      background-color: white;
    }

    @-webkit-keyframes savesuccess {
      0% {background-color: white;}
      22% {background-color: #aaffaa;}
      100% {background-color: white;}
    }
        
    .savesuccessflash {
      animation-name: savesuccess;
      animation-duration: 300ms;
      animation-iteration-count: 1;
      animation-timing-function: ease-in-out;
      -webkit-animation-name: savesuccess;
      -webkit-animation-duration: 300ms;
      -webkit-animation-iteration-count: 1;
      -webkit-animation-timing-function: ease-in-out;
    }

    @-webkit-keyframes savefail {
      0% {background-color: white;}
      22% {background-color: #ffaaaa;}
      88% {background-color: #ffaaaa;}
      100% {background-color: #ffaaaa;}
    }
        
    .savefailflash {
      animation-name: savefail;
      animation-duration: 300ms;
      animation-iteration-count: 1;
      animation-timing-function: ease-in-out;
      -webkit-animation-name: savefail;
      -webkit-animation-duration: 300ms;
      -webkit-animation-iteration-count: 1;
      -webkit-animation-timing-function: ease-in-out;
      background-color: #ffaaaa !important;
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

    if(this.getAttribute("type") == "select"){
      this.querySelectorAll("option")?.forEach(e => {
        this.shadowRoot.querySelector("select").appendChild(e)
      })
    }
  }

  async connectedCallback() {
    this.refresh();
    let value = this.getAttribute("value")
    if(value !== null && value !== undefined){
      this.setValue(value)
    }

    if(this.getAttribute("type") == "select" && !this.shadowRoot.querySelector("option")){
      await this.refreshLookups()
    }

    this.shadowRoot.querySelectorAll("select,input").forEach(e => e.addEventListener("change", this.valueChanged))
  }

  async refreshLookups(){
    let lookup = this.getAttribute("lookup");
    if(lookup){
      this.lookupRefreshPromise = new Promise(async resolve => {
        let dataTypes = await api.get("system/datatypes", {cache: true})
        let permissions = await userPermissions()
        let type = dataTypes.find(t => t.id == lookup && (!t.permission || permissions.includes(t.permission) || permissions.includes("admin")))
        if(type){
          let options = (await api.get(type.api.path, {cache: true})).map(val => ({id: val[type.api.fields.id], name: val[type.api.fields.name]}))
                                                                    .sort((a, b) => a.name < b.name ? -1 : 1)
                                                                    .map(({id, name}) => `<option value="${id}">${this.hasAttribute("only-id") ? id : (type.ui.showId || this.hasAttribute("show-id")) ? `${id}: ${name}` : name}</option>`)
                                                                    .join("");
          if(this.getAttribute("type") == "select"){
            this.shadowRoot.querySelector("select").innerHTML = `<option value=""></option>${options}`
          } else {
            this.shadowRoot.getElementById("lookuplist").innerHTML = options
            this.shadowRoot.querySelector("input").setAttribute("list", "lookuplist")
          }
        }
        resolve();
      })
      await this.lookupRefreshPromise
    } else {
      this.shadowRoot.querySelector("input").setAttribute("list", "lookuplist")
      this.shadowRoot.querySelector("select").innerHTML = `<option value=""></option>`
    }
  }

  async valueChanged(e){
    if(this.preventSaving) return;
    
    let patch = this.getAttribute("patch")
    let field = this.getAttribute("field") || this.getAttribute("id")

    let value = this.getValue();
    if(value === undefined) return;

    let patchObj = {}
    patchObj[field] = value;

    this.setAttribute("value", value)
    this.getValueElement()?.classList.remove("savefailflash")
    try{
      if(patch && field){
        await api.patch(patch, patchObj)
        this.getValueElement()?.classList.add("savesuccessflash")
        setTimeout(() => this.getValueElement()?.classList.remove("savesuccessflash"), 1000)
      }
      this.dispatchEvent(new CustomEvent("value-changed", {bubbles: false, cancelable: false}));

    } catch(err){
      console.log(err)
      fire("log", {level: "error", message: err})
      this.getValueElement()?.classList.add("savefailflash")
    }
  }

  getValue(){
    switch(this.getAttribute("type")){
        case "number":
          return parseFloat(this.getValueElement().value);
        case "text":
        case "password":
        case "date":
        case "select":
          return this.getValueElement().value;
        case "checkbox":
          return this.getValueElement().matches(":checked");
    }
    return undefined;
  }

  getValueTitle(){
    let value = this.getValue()
    return this.shadowRoot.querySelector(`option[value="${value}"]`)?.text
                || this.querySelector(`option[value="${value}"]`)?.text
  }

  getValueElement(){
    switch(this.getAttribute("type")){
        case "text":
        case "password":
        case "date":
          return this.shadowRoot.querySelector("input")
        case "number":
          return this.shadowRoot.querySelector("input");
        case "select":
          return this.shadowRoot.querySelector("select");
        case "checkbox":
          return this.shadowRoot.querySelector("input");
    }
    return null;
  }

  focus(){
    this.getValueElement()?.focus()
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
      this.shadowRoot.querySelector("input").setAttribute("placeholder", this.getAttribute("placeholder") || "");
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
        if(this.lookupRefreshPromise)
          this.lookupRefreshPromise.then(() => this.shadowRoot.querySelector("select").value = newValue)
        else
          this.shadowRoot.querySelector("select").value = newValue;
        break;
    }
    this.preventSaving = false;
  }

  static get observedAttributes() {
    return ["value", "type", "disabled", "lookup"];
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
      case "lookup":
        this.refreshLookups();
        break;
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}