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
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.shadowRoot.getElementById("logout").addEventListener("click", () => {
      api.post("/auth/logout")
      api.logout();
      location.reload(); 
    })
    this.refreshData()
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }

  async refreshData(){
    let me = (await api.query(`{
      me{
        id,
        msUsers{
          id,
          email
        },
        activeMSUser
      }
    }`)).me

    this.shadowRoot.getElementById("user-id").innerText = me.id
    this.shadowRoot.getElementById("user-email").innerText = me.msUsers?.find(ms => ms.id == me.activeMSUser)?.email || "N/A"
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}