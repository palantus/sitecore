const elementName = 'apikey-page'

import api from "../../system/api.mjs"
import {on, off} from "../../system/events.mjs"
import "../../components/field-ref.mjs"
import "../../components/field-edit.mjs"
import "../../components/field-list.mjs"
import "../../components/collapsible-card.mjs"
import {state} from "../../system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='../css/global.css'>
  <link rel='stylesheet' href='../css/searchresults.css'>
  <style>
    #container{
      padding: 10px;
    }
    table thead th:nth-child(1){width: 200px}
    table thead th:nth-child(2){width: 300px}

    #remotes-tab thead tr, #keys-tab thead tr{
      border-bottom: 1px solid var(--contrast-color-muted);
    }
    #remotes-tab tbody td, #keys-tab tbody td{padding-top: 5px;padding-bottom:5px;}
    
    .hidden{display: none;}
    .remote-action-buttons{margin-top: 10px;}
    collapsible-card > div{
      padding: 10px;
    }
    collapsible-card{
      margin-bottom: 10px;
      display: block;
    }
    #new-key-btn{margin-top: 5px;}

    #keys-tab thead th:nth-child(1){width: 100px}
    #keys-tab thead th:nth-child(2){width: 200px}
    #keys-tab thead th:nth-child(3){width: 100px}
    #keys-tab thead th:nth-child(4){width: 200px}
    field-list{
      width: 500px;
      margin-bottom: 10px;
    }
    p.ok{color: green;}
    p.fail{color: red;}
  </style>

  <div id="container">
    <h1>API key</h1>
    <field-list labels-pct="20">
      <field-edit type="text" label="Name" id="name"></field-edit>
      <field-ref label="User" id="user"></field-ref>
      <field-edit type="checkbox" label="Federation" id="federation"></field-edit>
    </field-list>

    <div id="federation-container" class="hidden">
      <collapsible-card>
        <span slot="title">Federation setup</span>
        <div>
          <p>Enter domain name or other unique identifier used on the remote instance - eg. example.com for users named myuser@example.com.</p>
          <p>Note that it must match what is entered in Federation setup on the remote instance, as it is used to limit the pool of available user id's.</p>
          <field-list labels-pct="20">
            <field-edit type="text" label="Domain name" id="identifier"></field-edit>
          </field-list>
        </div>
      </collapsible-card>

      <collapsible-card>
        <span slot="title">Federation status</span>
        <div id="status"></div>
      </collapsible-card>

      <collapsible-card>
        <span slot="title">Roles for new users</span>
        <div>
          <p>Newly created federation users will get the following roles on this instance:</p>
          <table>
            <tbody id="roles">
            </tbody>
          </table>
        </div>
      </collapsible-card>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
   
    this.refreshData = this.refreshData.bind(this)

    this.keyId = /\/setup\/apikey\/([\d]+)/.exec(state().path)[1]

    this.shadowRoot.getElementById("federation").addEventListener("value-changed", this.refreshData);
  }

  async refreshData(){

    let key = await api.get(`system/apikeys/${this.keyId}`)

    this.shadowRoot.getElementById("name").setAttribute("value", key.name);
    this.shadowRoot.getElementById("federation").setAttribute("value", key.federation);
    this.shadowRoot.getElementById("user").setAttribute("ref", `/setup/users/${key.userId}`);
    this.shadowRoot.getElementById("user").innerText = key.userId;
    this.shadowRoot.getElementById("identifier").setAttribute("value", key.identifier||"");

    if(key.federation){
      let roles = await api.get("role")
      this.shadowRoot.getElementById("roles").innerHTML = roles.sort((a, b) => a.id.toLowerCase() < b.id.toLowerCase() ? -1 : 1).map(role =>  ` 
        <tr class="result">
          <td>${role.id}</td>
          <td><field-edit type="checkbox" field="enabled" patch="system/apikeys/${this.keyId}/role/${role.id}" value="${key.roles.find(r => r.id == role.id)?"true":"false"}"></field-edit></td>
        </tr>
      `).join("")
    }
    this.shadowRoot.getElementById("federation-container").classList.toggle("hidden", !key.federation)

    let user = await api.get(`user/${key.userId}/full`)
    let permissions = user?.permissions||[]
    this.shadowRoot.getElementById("status").innerHTML = `
      <p class="${user ? "ok" : "fail"}">User must exist</p>
    `

    this.shadowRoot.querySelectorAll("field-list field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `system/apikeys/${this.keyId}`));
  }

  connectedCallback() {
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}