let elementName = "topbar-component"

import { on, off } from "../system/events.mjs"
import {getApiConfig, ready} from "../system/core.mjs"
import "../components/topbar-user.mjs"
import "../components/topbar-notifications.mjs"
import { toggleInRightbar } from "../pages/rightbar/rightbar.mjs"
import Toast from "../components/toast.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>        
    #log{
      margin-top: 2px;
      text-align: right;
      font-size: 120%;
      width: 100%;
      opacity: 1;
      transition: opacity 200ms;
      pointer-events: none;
    }
    #log[level="info"]{
      color: #eee;
    }
    #log[level="error"]{
      color: #f00;
    }
    #log.hidden{
      opacity: 0;
    }
    #container{
      display: flex;
      justify-content: flex-end;
      gap: 7px;
      padding-right: 5px;
      padding-top: 4px;
    }
  </style>

  <div id="container">
    <span id="log" class="hidden"></span>
    <topbar-notifications-component class="beforetarget"></topbar-notifications-component>
    <topbar-user-component></topbar-user-component>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.clearCurLogItem = this.clearCurLogItem.bind(this);

    this.shadowRoot.getElementById("container").addEventListener("click", e => {
      toggleInRightbar(e.target.getAttribute("page"))
    })

    ready.then(() => {
      let components = getApiConfig().mods.map(m => m.files.filter(f => /\/topbar\-[a-zA-z0-9]+\.mjs/.test(f))).flat();
      let beforeTarget = this.shadowRoot.querySelector(".beforetarget")
      for(let path of components.sort((a, b) => a < b ? -1 : 1)){
        import(path).then(i => {
          let div = document.createElement("div")
          div.innerHTML = `<${i.name}></${i.name}>`
          this.shadowRoot.getElementById("container").insertBefore(div, beforeTarget)
        })
      }
    })
  }

  connectedCallback() {
    on("log", "topbar", (message) => {
      /*
      clearTimeout(this.logTimeout)
      this.shadowRoot.getElementById("log").classList.remove("hidden")
      let msg = typeof message === "object" ? message : { level: "info", message }
      msg.level = msg.level || "info"
      this.shadowRoot.getElementById("log").setAttribute("level", msg.level == "error" ? "error" : "info")
      this.shadowRoot.getElementById("log").innerText = msg.message
      this.logTimeout = setTimeout(this.clearCurLogItem, 5000)
      */
      new Toast({
        text: typeof message === "object" ? message.message : message
      })
    })
  }

  clearCurLogItem() {
    this.shadowRoot.getElementById("log").classList.add("hidden")
  }

  disconnectedCallback() {
    off("log", "topbar")
  }
}


window.customElements.define(elementName, Element);
export { Element, elementName as name }