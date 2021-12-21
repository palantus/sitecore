const elementName = 'rightbar-user-component'

import api from "/system/api.mjs"
import "/pages/rightbar/rightcard.mjs"
import {on, off} from "/system/events.mjs"
import "/components/field.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{color: white; padding: 10px;}
    h2{margin: 0px; border-bottom: 1px solid lightgray; padding-bottom: 5px;}
    span{color: var(--accent-color-light);}
  </style>
  <div id="container">
      <h2>Status</h2>

      <p>Logged in as <b><span id="user-id"/></b> with email <b><span id="user-email"/></b></p>
      <button id="logout">Log out</button>

      <br>
      <br>
      <h2>Setup</h2>
      <br>

      <h3>Notifications</h3>
      <field-component label="Threads" title="Receive a notification every time a new thread or reply is posted"><input type="checkbox" id="setup-forum-notify"></input></field-component>
      <field-component label="Changesets" title="Receive a notification on new changesets"><input type="checkbox" id="setup-changeset-notify"></input></field-component>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.setupChange = this.setupChange.bind(this)

    this.shadowRoot.getElementById("logout").addEventListener("click", () => {
      api.post("/auth/logout")
      api.logout();
      location.reload(); 
    })
    this.refreshData()
    this.shadowRoot.getElementById("setup-forum-notify").addEventListener("change", this.setupChange);
    this.shadowRoot.getElementById("setup-changeset-notify").addEventListener("change", this.setupChange);
  }

  setupChange({target : e}){
    switch(e.id){
      case "setup-forum-notify":
        api.patch("me/setup", {notifyOnForumUpdates: e.checked})
        break;
      case "setup-changeset-notify":
        api.patch("me/setup", {notifyOnNewChangesets: e.checked})
        break;
    }
  }

  connectedCallback() {
    on("changed-project", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-project", elementName)
  }

  async refreshData(){
    let me = (await api.query(`{
      me{
        id,
        msUsers{
          id,
          email
        },
        activeMSUser,
        setup{
          notifyOnForumUpdates,
          notifyOnNewChangesets
        }
      }
    }`)).me

    this.shadowRoot.getElementById("user-id").innerText = me.id
    this.shadowRoot.getElementById("user-email").innerText = me.msUsers?.find(ms => ms.id == me.activeMSUser)?.email || "N/A"
    this.shadowRoot.getElementById("setup-forum-notify").checked = me.setup.notifyOnForumUpdates
    this.shadowRoot.getElementById("setup-changeset-notify").checked = me.setup.notifyOnNewChangesets
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}