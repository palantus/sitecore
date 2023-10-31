let elementName = "popup-component"

import { stylesheets } from "../system/core.mjs"

/*
  Notes: 
  - Usage: 
            popup(textOrElement, title)
            showPopup(<popup-component element>)
  - Sizing: Apply attributes small, medium, large or full to size it in specific sizes. 
            Otherwise skip it and restrict the size of the content yourself.
*/

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host{
      z-index: 15;
    }
    #container{
      position: relative;
      left: 0px;
      right: 0px;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.55);
      z-index: 15;
      overflow: hidden;
    }
    #dialog{
      position: absolute;
      left: 50%;
      top: 0px;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      border-left: 1px solid var(--contrast-color-muted);
      box-shadow: -5px 0px 25px #555;
      padding: 10px;
      overflow: auto;
    }

    :host(popup-component[small]) #dialog{width: min(400px, 100% - 20px); height: 300px;}
    :host(popup-component[medium]) #dialog{width: min(600px, 100% - 20px); height: 400px;}
    :host(popup-component[large]) #dialog{width: min(1200px, 100% - 20px); height: 900px;}
    :host(popup-component[full]) #dialog{width: calc(100% - 20px); height: calc(100% - 20px)}

    #dialog::after{
      content: "";
      top: 0;
      left: 0;
      position: absolute;
      z-index: -2;
      backdrop-filter: blur(5px);
      background-size: cover;
      height: 100%;
      width: 100%;
    }
    #buttons{
      text-align: right;
      margin-left: auto;
      padding-right: 5px;
      padding-left: 5px;
    }
    #topbar{
      display: flex;border-bottom: 1px solid gray;
      margin-top: 0px;
      margin-bottom: 10px;
      user-select: none;
    }

    :host, :host(popup-component:not(.open)){
      pointer-events: none;
    }
    :host(popup-component.open){
      pointer-events: inherit;
    }
    :host #container{
      opacity: 0;
    }
    :host(popup-component.open) #container{
      transition: opacity 200ms;
      opacity: 1;
    }
    :host(popup-component:not(.open)) #container{
      opacity: 0;
      transition: opacity 200ms;
    }
    
    :host(popup-component.open) #dialog {
      animation: slide 0.3s forwards;
    }
    :host(popup-component:not(.open)) #dialog {
      animation: slideback 0.3s forwards;
    }
    @keyframes slide {
        0% { top: -500px; }
        100% { top: 0; }
    }
    @keyframes slideback {
        0% { top: 0px; }
        100% { top: -500px; }
    }
    #slot-container{
      overflow-y: auto;
      max-height: calc(100% - 62px);
    }
    .hidden{display: none;}
  </style>
  <div id="container">
    <div id="dialog">
      <div id="topbar">
        <h2 id="title"></h2>
        <div id="buttons">
          <slot name="buttons"></slot>
          <span id="close" class="popup-button" title="Close popup" tabindex="0">&#x2715;</span>
        </div>
      </div>
      <div id="slot-container">
        <slot></slot>
      </div>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global]
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    //this.shadowRoot.querySelector('h3').innerText = this.getAttribute('name');
    //this.shadowRoot.querySelector('img').src = this.getAttribute('avatar');
    
    this.close = this.close.bind(this);
    this.keydown = this.keydown.bind(this);
    this.containerClicked = this.containerClicked.bind(this);

    this.style.width = "100%";
    this.style.height = "100%";
    this.style.position = "fixed";
    this.style.left = "0px";
    this.style.top = "0px";

    this.shadowRoot.getElementById("title").innerText = this.getAttribute("title") || "Dialog"
  }

  connectedCallback() {
    this.shadowRoot.getElementById('close').addEventListener('click', this.close);
    this.shadowRoot.getElementById("container").addEventListener("keydown", this.keydown)
    this.shadowRoot.getElementById("container").addEventListener("click", this.containerClicked)
  }

  close(e){
    //this.style.display = "none";
    this.dispatchEvent(new CustomEvent("close-clicked", {bubbles: false, cancelable: false, detail: e}));
  }

  keydown(evt){
    switch(evt.keyCode){
      case 27: //esc
        this.shadowRoot.getElementById("close").click();
        break;
    }
  }

  containerClicked(event){
    if(event.target.id == "container"){ // Clicked on modal transparant area
      this.shadowRoot.getElementById("close").click();
    }
  }

  disconnectedCallback() {
    this.shadowRoot.getElementById('close').removeEventListener('click', this.close);
    document.removeEventListener("keydown", this.keydown)
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "title":
        this.shadowRoot.getElementById("title").innerText = newValue || "Dialog"
        break;
    }
  }

  static get observedAttributes() {
    return ["title"];
  }  
}

export function showPopup(popup, {show, close} = {}){
  popup.classList.add("open");
  popup.shadowRoot.getElementById('close').toggleAttribute("disabled", false)
  popup.shadowRoot.getElementById("close").focus()

  if(typeof show === "function"){
    try{
      show();
    } catch(err){
      console.log(err)
    }
  }

  let doClose = () => {
    popup.classList.remove("open");
    
    if(typeof close === "function"){
      try{
        close(typeof values === "function" ? values() : {})
      } catch(err){
        console.log(err)
      }
    }
  }

  let closeClicked = () => {
    let val = typeof values === "function" ? values() : {}
    if(typeof close === "function"){
      try{
        close(val)
      } catch(err){
        console.log(err)
      }
    }
    doClose();
  }

  popup.addEventListener("close-clicked", closeClicked)
}

export async function popup(htmlOrElement, {title = null} = {}){
  let container = document.createElement("div")
  container.innerHTML = `<popup-component title="${title ||"Popup"}"></popup-component>`
  let popupElement = container.firstElementChild;

  if(typeof htmlOrElement === "string")
    popupElement.innerHTML = `<div>${htmlOrElement}</div>`
  else
    popupElement.appendChild(htmlOrElement)
  document.getElementById("body-container").appendChild(container)
  return new Promise(resolve => {
    setTimeout(() => { //Animations needs the element to exist before it is changed again
      showPopup(popupElement, {
        show: () => {
          popupElement.shadowRoot.getElementById("close").focus()
        },
        close: async (val) => {
          resolve(true)
          setTimeout(() => container.remove(), 2000)
        }
      })
    }, 0)
  })
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}