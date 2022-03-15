
import { onMessage } from "/system/message.mjs";
import { on, off, fire } from "../system/events.mjs"
import { isSignedIn } from "../system/user.mjs";
import { ready, state } from "../system/core.mjs"
import api from "/system/api.mjs";
import Toast from "/components/toast.mjs"
import { toggleInRightbar } from "/pages/rightbar/rightbar.mjs";

let elementName = "topbar-notifications-component"
const template = document.createElement('template');
template.innerHTML = `
  <style>
    img.noti{
      filter: invert(1);
      width: 22px;
      top: 4px;
      cursor: pointer;
    }
    img.noti:hover{
      filter: invert(80%);
    }

    .counter{
      width: 22px;
      top: -11px;
      right: 4px;
      position: absolute;
      cursor: pointer;
      background: rgba(255, 0, 0, 0.7);
      border-radius: 10px;
      text-align: center;
      font-weight: bold;
      font-size: 110%;
      pointer-events: none;
      display: none;
    }

    #container{
      position: relative;
    }
  </style>
  <span id="container">
    <img class="noti" id="notifications-toggle" src="/img/bell.png" alt="Notifications" title="Notifications"/>
    <span class="counter" id="noti-counter"></span>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshCounters = this.refreshCounters.bind(this)

    this.setAttribute("page", "notifications");
  }

  connectedCallback() {
    on("changed-page", elementName, this.refreshCounters)
    on("logged-in", elementName, this.refreshCounters)
    on("logged-out", elementName, this.refreshCounters)
    onMessage("notification-new", elementName, ({id, message, details}) => {
      this.refreshCounters();
      new Audio("/libs/notification-sound.mp3").play();

      new Toast({
        text: details?.title ? `${details.title}: ${message}` : message,
        onClick: () => toggleInRightbar("notifications", true)
      })
    })
    onMessage("notification-dismissed", elementName, this.refreshCounters)
  }

  async refreshCounters() {
    await ready;
    if(!isSignedIn()) return;
    let counters = await api.get(`user/counters?page=${state().path}`, {cache: true, maxAge: 100})
    if (!counters) return;
    this.shadowRoot.getElementById("noti-counter").style.display = counters.notifications < 1 ? "none" : "inline"
    this.shadowRoot.getElementById("noti-counter").innerText = counters.notifications
  }
}

window.customElements.define(elementName, Element);
export { Element, elementName as name }