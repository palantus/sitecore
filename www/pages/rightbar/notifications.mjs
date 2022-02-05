const elementName = 'rightbar-notifications-component'

import api from "/system/api.mjs"
import "/pages/rightbar/rightcard.mjs"
import "/components/notification.mjs";
import { onMessage } from "../../system/message.mjs";
import "/components/field.mjs"
import {refToPath} from "/libs/refs.mjs"
import {on, off} from "/system/events.mjs"
import { confirmDialog } from "../../components/dialog.mjs";

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{color: white; padding: 10px; position: relative;}
    h2{margin: 0px; border-bottom: 1px solid lightgray; padding-bottom: 5px;}
    span{color: var(--accent-color-light);}
    notification-component{margin-top: 10px;}
    #dismissall{
      position: absolute;
      top: 0px;
      right: 0px;
      border: 0px;
      background: rgba(0,0,0,0.3);
      color: #eee;
      cursor:pointer;
    }
    #dismissall:hover{background: rgba(150,150,150,0.6);}
  </style>
  <div id="container">
    <h2>Notifications</h2>
    <button id="dismissall">Dismiss all</button>
    <div id="noti">
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.refreshData = this.refreshData.bind(this)
    this.addEventListener("opened", this.refreshData)

    this.shadowRoot.getElementById("dismissall").addEventListener("click", async () => {
      if(!await confirmDialog("Are you sure?")) return;
      await api.post("notifications/dismissall")
      this.refreshData();
    })
  }

  async refreshData(){
    let notifications = await api.get("notifications")
    if(notifications === undefined) return;
    this.shadowRoot.getElementById("noti").innerHTML = notifications.reverse().map(n => `
          <notification-component id="${n.id}" title="${n.details?.title||""}" timestamp="${n.timestamp.replace("T", " ").slice(0, 19)}">
            ${n.message}${n.details?.refs?.map(r => `<field-ref slot="ref${n.details.refs.indexOf(r)+1}" ref="${refToPath(r)}">${r.title||"Open"}</field-ref>`).join("")||""}
          </notification-component>`).join("")
  }

  connectedCallback() {
    onMessage("notification-new", elementName, this.refreshData)
    onMessage("notification-dismissed", elementName, this.refreshData)
    on("changed-project", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-project", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}