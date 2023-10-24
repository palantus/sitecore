let elementName = "field-edit"

import api from "/system/api.mjs"
import {userPermissions} from "/system/user.mjs"
import { fire } from "../system/events.mjs";

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    :host{display: inline-block;}
    #options{display: none;}
    input:not([type='checkbox']), textarea{
      width: calc(100% - 10px); /*Account for padding*/
    }
    select{
      width: 100%;
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
      <textarea></textarea>
      <datalist id="lookuplist"></datalist>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.valueChanged = this.valueChanged.bind(this)
    this.focus = this.focus.bind(this)
    this.getValue = this.getValue.bind(this)
    this.setValue = this.setValue.bind(this)
    this.select = this.select.bind(this)

    if(this.getAttribute("type") == "select"){
      this.querySelectorAll("option")?.forEach(e => {
        this.shadowRoot.querySelector("select").appendChild(e)
      })
    }

    if(this.hasAttribute("min"))
      this.shadowRoot.querySelector("input").setAttribute("min", this.getAttribute("min"))
    if(this.hasAttribute("max"))
      this.shadowRoot.querySelector("input").setAttribute("max", this.getAttribute("max"))
    if(this.hasAttribute("rows"))
      this.shadowRoot.querySelector("textarea").setAttribute("rows", this.getAttribute("rows"))
    if(this.hasAttribute("cols"))
      this.shadowRoot.querySelector("textarea").setAttribute("cols", this.getAttribute("cols"))
    if(this.hasAttribute("maxlength"))
      this.shadowRoot.querySelector("input").setAttribute("maxlength", this.getAttribute("maxlength"))

    this.addEventListener("focus", this.focus)
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

    this.shadowRoot.querySelectorAll("select,input,textarea").forEach(e => e.addEventListener("change", this.valueChanged))
  }

  async refreshLookups(){
    let lookup = this.getAttribute("lookup");
    if(lookup){
      this.lookupRefreshPromise = new Promise(async resolve => {
        let dataTypes = await api.get("system/datatypes", {cache: true})
        let permissions = await userPermissions()
        let type = dataTypes.find(t => t.id == lookup && (!t.permission || permissions.includes(t.permission) || permissions.includes("admin")))
        if(type){
          let value = this.getAttribute("value")
          let options = (await api.get(type.api.path, {cache: true})).map(val => ({id: val[type.api.fields.id], name: val[type.api.fields.name]}))
                                                                    .sort((a, b) => a.name?.toLowerCase() < b.name?.toLowerCase() ? -1 : 1)
                                                                    .map(({id, name}) => `<option value="${id}" ${id==value?"selected":""}>${this.hasAttribute("only-id") ? id : (type.ui.showId || this.hasAttribute("show-id")) ? `${id}: ${name}` : name}</option>`)
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

    this.getValueElement()?.classList.remove("savefailflash")
    try{
      if(patch && field){
        await api.patch(patch, patchObj)
        this.getValueElement()?.classList.add("savesuccessflash")
        setTimeout(() => this.getValueElement()?.classList.remove("savesuccessflash"), 1000)
        this.currentKnownStoredValue = value;
      }
      this.setAttribute("value", value)
      this.dispatchEvent(new CustomEvent("value-changed", {bubbles: false, cancelable: false}));

    } catch(err){
      console.log(err)
      //fire("log", {level: "error", message: err})
      this.dispatchEvent(new CustomEvent("failed-patch", {bubbles: false, cancelable: false}));
      this.getValueElement()?.classList.add("savefailflash")
      this.setValue(this.currentKnownStoredValue)
    }
  }

  getValue(){
    switch(this.getAttribute("type")){
        case "number":
          return parseFloat(this.getValueElement().value);
        case "text":
        case "password":
        case "date":
        case "time":
        case "select":
        case "textarea":
          return this.getValueElement().value;
        case "checkbox":
          return this.getValueElement().matches(":checked");
    }
    return undefined;
  }

  getValueTitle(){
    let value = this.getValue() || this.getAttribute("value")
    return this.shadowRoot.querySelector(`option[value="${value}"]`)?.text
                || this.querySelector(`option[value="${value}"]`)?.text
                || this.shadowRoot.querySelector(`option:first-child`)?.text
                || this.querySelector(`option:first-child`)?.text
                || value
                
  }

  getValueElement(){
    switch(this.getAttribute("type")){
        case "text":
        case "password":
        case "date":
        case "time":
          return this.shadowRoot.querySelector("input")
        case "number":
          return this.shadowRoot.querySelector("input");
        case "select":
          return this.shadowRoot.querySelector("select");
        case "checkbox":
          return this.shadowRoot.querySelector("input");
        case "textarea":
          return this.shadowRoot.querySelector("textarea");
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
      this.shadowRoot.querySelector("textarea").style.display = "none"
      
      this.shadowRoot.querySelector("select").toggleAttribute("disabled", this.hasAttribute("disabled"))
    } else if(this.getAttribute("type") == "textarea"){
      this.shadowRoot.querySelector("input").style.display = "none"
      this.shadowRoot.querySelector("select").style.display = "none"
      this.shadowRoot.querySelector("textarea").style.display = "block"
      
      this.shadowRoot.querySelector("textarea").toggleAttribute("disabled", this.hasAttribute("disabled"))
    } else {
      this.shadowRoot.querySelector("input").style.display = "block"
      this.shadowRoot.querySelector("select").style.display = "none"
      this.shadowRoot.querySelector("textarea").style.display = "none"
      
      this.shadowRoot.querySelector("input").setAttribute("type", this.getAttribute("type"));
      this.shadowRoot.querySelector("input").setAttribute("placeholder", this.getAttribute("placeholder") || "");
      this.shadowRoot.querySelector("input").toggleAttribute("disabled", this.hasAttribute("disabled"))
    }

    if(this.getAttribute("type") == "select" && !this.shadowRoot.querySelector("select option")){
      this.querySelectorAll("option")?.forEach(e => {
        this.shadowRoot.querySelector("select").appendChild(e)
      })
    }
  }
  
  setValue(newValue){
    this.preventSaving = true;
    switch(this.getAttribute("type")){
      case "checkbox":
        this.shadowRoot.querySelector("input").checked = newValue !== "false" && newValue !== false;
        break;
      case "text":
      case "password":
      case "date":
      case "time":
      case "number":
        this.shadowRoot.querySelector("input").value = newValue;
        break;
      case "textarea":
        this.shadowRoot.querySelector("textarea").value = newValue;
        break;
      case "select":
        if(this.lookupRefreshPromise)
          this.lookupRefreshPromise.then(() => this.shadowRoot.querySelector("select").value = newValue)
        else
          this.shadowRoot.querySelector("select").value = newValue;
        break;
    }
    this.currentKnownStoredValue = newValue;
    this.preventSaving = false;
  }

  select(){
    this.getValueElement().select()
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