const elementName = 'mods-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-ref.mjs"
import "/components/field.mjs"
import "/components/field-edit.mjs"
import {on, off} from "/system/events.mjs"
import {goto} from "/system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style>
    #container{
        padding: 10px;
    }
    table{
      width: 100%;
      margin-top: 5px;
      box-shadow: 0px 0px 10px gray;
      border: 1px solid gray;
    }
    table thead tr{
      border: 1px solid gray;
    }

    table thead th:nth-child(1){width: 100px}
  </style>  

  <div id="container">
    <h1>Server mods</h1>
    <p>Note: Enabling/disabling mods only has an effect after the server is restarted.</p>

    <table>
        <thead>
            <tr>
              <th>Id</th>
              <th>Enabled</th>
            </tr>
        </thead>
        <tbody id="mods">
        </tbody>
    </table>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    this.clicked = this.clicked.bind(this)

    this.shadowRoot.getElementById("mods").addEventListener("click", this.clicked)
    
    this.refreshData();
  }

  async refreshData(){
    let mods = await api.get("system/mods")
    this.shadowRoot.getElementById("mods").innerHTML = mods.map(m => `
      <tr>
        <td>${(m.hasSetup && m.enabled) ? `<field-ref ref="/${m.id}/setup">${m.id}</field-ref>` : `${m.id}`}</td>
        <td><field-edit field="enabled" type="checkbox" patch="system/mod/${m.id}" value="${m.enabled ? "true" : "false"}"></field-edit></td>
      </tr>
    `).join("")
  }

  clicked(e){
    if(!e.target.classList.contains("setupbtn")) return;
    goto(`/${e.target.getAttribute("data-mod")}/setup`)
  }

  connectedCallback() {
    on("changed-page", "apikeys", this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", "apikeys")
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}