let elementName = "dialog-component"
const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    :host{
      z-index: 15;
    }
    #container{
      position: fixed;
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
      right: 0px;
      width: min(400px, 100% - 20px);
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      border-left: 1px solid var(--contrast-color-muted);
      box-shadow: -5px 0px 25px #555;
      padding: 10px;
      overflow: auto;
      padding-bottom: 75px;
    }
    #buttons{
      text-align: right;
      position: absolute;
      bottom: 100px;
      right: 10px;
    }
    #title{
      border-bottom: 1px solid gray;
      margin-top: 0px;
      padding-bottom: 10px;
      user-select: none;
    }
    #validateResult{
      color: red;
      /*text-align: right;*/
      /*position: fixed;*/
      /*bottom: 50px;*/
      /*right: 10px;*/
      /*font-size: 110%;*/
      margin-top: 10px;
      border-top: 1px solid var(--contrast-color-muted);
      padding-top: 5px;
    }
    :host, :host(dialog-component:not(.open)){
      pointer-events: none;
    }
    :host(dialog-component.open){
      pointer-events: inherit;
    }
    :host #container{
      opacity: 0;
    }
    :host(dialog-component.open) #container{
      transition: opacity 200ms;
      opacity: 1;
    }
    :host(dialog-component:not(.open)) #container{
      opacity: 0;
      transition: opacity 200ms;
    }
    
    :host(dialog-component.open) #dialog {
      /*animation: slide 0.3s forwards;*/
    }
    :host(dialog-component:not(.open)) #dialog {
      animation: slideback 0.3s forwards;
    }
    @keyframes slide {
        0% { right: -500px; }
        100% { right: 0; }
    }
    @keyframes slideback {
        0% { right: 0px; }
        100% { right: -500px; }
    }
    #slot-container{
      overflow-y: auto;
      max-height: calc(100% - 150px);
    }
    .hidden{display: none;}
  </style>
  <div id="container">
    <div id="dialog">
      <h1 id="title"></h1>
      <div id="slot-container">
        <slot></slot>
      </div>
      <div id="validateResult" class="hidden"></div>
      <div id="buttons">
        <button class="styled" id="ok">Ok</button>
        <button class="styled" id="cancel">Cancel</button>
      </div>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    //this.shadowRoot.querySelector('h3').innerText = this.getAttribute('name');
    //this.shadowRoot.querySelector('img').src = this.getAttribute('avatar');
    
    this.ok = this.ok.bind(this);
    this.cancel = this.cancel.bind(this);
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
    this.shadowRoot.getElementById('ok').addEventListener('click', this.ok);
    this.shadowRoot.getElementById('cancel').addEventListener('click', this.cancel);
    document.addEventListener("keydown", this.keydown)
    this.shadowRoot.getElementById("container").addEventListener("click", this.containerClicked)

    if(this.hasAttribute("no-cancel"))
      this.shadowRoot.getElementById('cancel').style.display = "none"
  }

  ok(){
    //this.style.display = "none";
    this.dispatchEvent(new CustomEvent("ok-clicked", {bubbles: false, cancelable: false}));
  }

  cancel(){
    //this.style.display = "none";
    this.dispatchEvent(new CustomEvent("cancel-clicked", {bubbles: false, cancelable: false}));
  }

  keydown(evt){
    switch(evt.keyCode){
      case 27: //esc
        this.shadowRoot.getElementById("cancel").click();
        break;

      case 13: //enter
        if(evt.target.tagName != "TEXTAREA")
          this.shadowRoot.getElementById("ok").click();
        break;
    }
  }

  containerClicked(event){
    if(event.target.id == "container"){ // Clicked on modal transparant area
      this.shadowRoot.getElementById("cancel").click();
    }
  }

  disconnectedCallback() {
    this.shadowRoot.getElementById('ok').removeEventListener('click', this.ok);
    this.shadowRoot.getElementById('cancel').removeEventListener('click', this.cancel);
    document.addEventListener("keydown", this.keydown)
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "validationerror":
        this.shadowRoot.getElementById("validateResult").innerHTML = newValue
        this.shadowRoot.getElementById("validateResult").classList.toggle("hidden", !!!newValue)
        break;

      case "title":
        this.shadowRoot.getElementById("title").innerText = newValue || "Dialog"
        break;
    }
  }

  static get observedAttributes() {
    return ["validationerror", "title"];
  }  
}

export function showDialog(dialog, {ok, cancel, show, validate, values, close} = {}){
  dialog.classList.add("open");

  if(typeof show === "function"){
    show();
  }

  let doClose = () => {
    dialog.classList.remove("open");
    dialog.removeEventListener("ok-clicked", okClicked)
    dialog.removeEventListener("cancel-clicked", okClicked)
    dialog.removeAttribute("validationerror")
    
    if(typeof close === "function"){
      close(typeof values === "function" ? values() : {})
    }
  }

  let okClicked = async () => {
    let val = typeof values === "function" ? values() : {}

    if(typeof validate === "function"){
      dialog.removeAttribute("validationerror")

      let validateResult = await validate(val)

      if(validateResult === false){
        dialog.setAttribute("validationerror", "Invalid input")
        return;
      }
      if(typeof validateResult === "string"){
        dialog.setAttribute("validationerror", validateResult)
        return;
      }
    }
    if(typeof ok === "function"){
      try{
        await ok(val)
      } catch(err){
        dialog.setAttribute("validationerror", err||"Some error occured. Expect that it didn't work.")
        return;
      }
    }
    doClose();
  }

  let cancelClicked = () => {
    let val = typeof values === "function" ? values() : {}
    if(typeof cancel === "function"){
      cancel(val)
    }
    doClose();
  }

  dialog.addEventListener("ok-clicked", okClicked)
  dialog.addEventListener("cancel-clicked", cancelClicked)
}

export async function confirmDialog(text, {title = null} = {}){
  let container = document.createElement("div")
  container.innerHTML = `<dialog-component title="${title || "Confirm"}"><div>${text}</div></dialog-component>`
  document.getElementById("body-container").appendChild(container)
  let dialog = container.querySelector("dialog-component")
  return new Promise(resolve => {
    setTimeout(() => { //Animations needs the element to exist before it is changed again
      showDialog(dialog, {
        show: () => {
          dialog.shadowRoot.getElementById("ok").focus()
        },
        ok: async (val) => {
          resolve(true)
          setTimeout(() => container.remove(), 2000)
        },
        cancel: async (val) => {
          resolve(false)
          setTimeout(() => container.remove(), 2000)
        }
      })
    }, 0)
  })
}

export async function promptDialog(text, defValue, {selectValue = false, title = null, validate = undefined} = {}){
  let container = document.createElement("div")
  container.innerHTML = `
    <dialog-component title="${title || "Prompt"}">
      <div>${text}: </div><input style="margin-top: 5px; width: 350px"></input></input>
    </dialog-component>`
  document.getElementById("body-container").appendChild(container)
  let dialog = container.querySelector("dialog-component")
  dialog.querySelector("input").value = defValue || ""
  return new Promise(resolve => {
    setTimeout(() => { //Animations needs the element to exist before it is changed again
      showDialog(dialog, {
        show: () => {
          dialog.querySelector("input").focus()
          if(selectValue) dialog.querySelector("input").select()
        },
        ok: async (val) => {
          resolve(dialog.querySelector("input").value)
          setTimeout(() => container.remove(), 2000)
        },
        cancel: async (val) => {
          resolve(null)
          setTimeout(() => container.remove(), 2000)
        },
        validate: () => {
          return typeof validate === "function" ? validate(dialog.querySelector("input").value) : true
        }
      })
    }, 0)
  })
}

export async function alertDialog(text, {title = null} = {}){
  let container = document.createElement("div")
  container.innerHTML = `<dialog-component title="${title ||"Alert"}" no-cancel><div>${text}</div></dialog-component>`
  document.getElementById("body-container").appendChild(container)
  let dialog = container.querySelector("dialog-component")
  return new Promise(resolve => {
    setTimeout(() => { //Animations needs the element to exist before it is changed again
      showDialog(dialog, {
        show: () => {
          dialog.shadowRoot.getElementById("ok").focus()
        },
        ok: async (val) => {
          resolve(true)
          setTimeout(() => container.remove(), 2000)
        },
        cancel: async (val) => {
          resolve(false)
          setTimeout(() => container.remove(), 2000)
        }
      })
    }, 0)
  })
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}