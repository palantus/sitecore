let elementName = "topbar-component"

import { ready, state } from "../system/core.mjs"
import { on, off, fire } from "../system/events.mjs"
import "/components/notification.mjs";
import { onMessage } from "/system/message.mjs";
import api from "/system/api.mjs";
import { isSignedIn } from "../system/user.mjs";

const template = document.createElement('template');
template.innerHTML = `
  <style>
    img{
        position: fixed;
        cursor: pointer;
    }

    img.profile{
        width: 26px;
        filter: grayscale(100%);
        right: 10px;
        top: 4px;
    }
    img.profile:hover{
        filter: grayscale(80%);
    }

    img.noti{
        filter: invert(1);
        right: 48px;
        width: 22px;
        top: 4px;
    }
    img.noti:hover{
        filter: invert(80%);
    }
    #noti-counter{
      right: 48px;
      width: 22px;
    }
    .counter{
      top: 9px;
      position: fixed;
      cursor: pointer;
      background: rgba(255, 0, 0, 0.7);
      border-radius: 10px;
      text-align: center;
      font-weight: bold;
      font-size: 110%;
      pointer-events: none;
      display: none;
    }
        
    #log{
      position: fixed;
      right: 82px;
      top: 6px;
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
      position: relative;
      z-index: 10;
    }
    notification-component:not(:last-child){
      margin-bottom: 10px;
    }
  </style>

  <div id="container">
    <span id="log" class="hidden"></span>
    <img class="noti" id="notifications-toggle" src="/img/bell.png" alt="Notifications" title="Notifications"/>
    <span class="counter" id="noti-counter"></span>
    <img class="profile" id="user-toggle" src="/img/profile.png" alt="Profile" title="Profile"/>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.clearCurLogItem = this.clearCurLogItem.bind(this);
    this.refreshCounters = this.refreshCounters.bind(this);

    /*
    this.shadowRoot.getElementById("notifications-toggle").addEventListener("click", () => {
      this.shadowRoot.getElementById("notifications").classList.toggle("shown")
    })
    */
    this.shadowRoot.querySelectorAll("#user-toggle,#notifications-toggle").forEach(e => e.addEventListener("click", event => {
      let rightBar = document.querySelector("#grid-container .right rightbar-component");
      let pageId = event.target.id.replace("-toggle", "")
      rightBar.setAttribute("page", rightBar.getAttribute("page") == pageId ? "" : pageId)
    }))

    this.refreshCounters();
  }

  connectedCallback() {

    on("log", "topbar", (message) => {
      clearTimeout(this.logTimeout)
      this.shadowRoot.getElementById("log").classList.remove("hidden")
      let msg = typeof message === "object" ? message : { level: "info", message }
      msg.level = msg.level || "info"
      this.shadowRoot.getElementById("log").setAttribute("level", msg.level == "error" ? "error" : "info")
      this.shadowRoot.getElementById("log").innerText = msg.message
      this.logTimeout = setTimeout(this.clearCurLogItem, 5000)
    })
    on("changed-page", "topbar", this.refreshCounters)
    on("logged-in", "topbar", this.refreshCounters)
    on("logged-out", "topbar", this.refreshCounters)
    onMessage("action-state-changed", elementName, this.refreshCounters)
    onMessage("notification-new", elementName, () => {
      this.refreshCounters();
      new Audio("/libs/notification-sound.mp3").play();
    })
    onMessage("notification-dismissed", elementName, this.refreshCounters)
  }

  async refreshCounters() {
    await ready;
    if(!isSignedIn()) return;
    try{
      let counters = await api.get(`user/counters?page=${state().path}`)
      if (!counters) return;
      this.shadowRoot.getElementById("noti-counter").style.display = counters.notifications < 1 ? "none" : "inline"
      this.shadowRoot.getElementById("noti-counter").innerText = counters.notifications
    } catch(err){}
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