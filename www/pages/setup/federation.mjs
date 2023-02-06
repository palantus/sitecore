const elementName = 'federation-page'

import api from "/system/api.mjs"
import {on, off} from "/system/events.mjs"
import {getUser} from "/system/user.mjs"
import "/components/field-ref.mjs"
import "/components/field-edit.mjs"
import "/components/context-menu.mjs"
import "/components/collapsible-card.mjs"
import {showDialog, confirmDialog} from "/components/dialog.mjs"
import {uuidv4} from "/libs/uuid.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
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
  </style>

  <div id="container">
    <h1>Federation</h1>

    <collapsible-card>
      <span slot="title">API keys authorized for federation</span>
      <div>
        <p>Note: API keys listed here can be used to create federation users on THIS instance.</p>
        <table id="keys-tab">
          <thead>
              <tr>
                <th>Id</th>
                <th>Name</th>
                <th>User</th>
                <th>Issued</th>
                <th></th>
              </tr>
          </thead>
          <tbody id="apikeys" class="container">
          </tbody>
        </table>
        <button class="styled" id="new-key-btn">Add key</button>
      </div>
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

    <collapsible-card>
      <span slot="title">External servers (remotes)</span>
      <div>
        <table id="remotes-tab">
          <thead>
              <tr>
                <th>Title</th>
                <th>API URL</th>
                <th></th>
              </tr>
          </thead>
          <tbody id="remotes" class="container">
          </tbody>
        </table>
        <button class="styled" id="new-remote-btn">Add remote</button>
      </div>
    </collapsible-card>
    
  </div>

  <dialog-component title="New remote" id="new-dialog">
    <field-component label="Title"><input id="new-title"></input></field-component>
    <field-component label="API URL"><input id="new-url"></input></field-component>
    <field-component label="API Key"><input id="new-apiKey"></input></field-component>
  </dialog-component>

  <dialog-component title="New API Key" id="newkey-dialog">
    <field-component label="Name"><input id="newkey-name"></input></field-component>
    <field-component label="User"><input id="newkey-user" list="users"></input></field-component>
    <field-component label="Key"><input id="newkey-key"></input></field-component>
    <p>Remember to copy the key above, as it will not be shown/available again!</p>
  </dialog-component>

  <datalist id="users">
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
   
    this.refreshData = this.refreshData.bind(this)
    this.newRemote = this.newRemote.bind(this)
    this.newKey = this.newKey.bind(this);

    this.shadowRoot.getElementById("new-remote-btn").addEventListener("click", this.newRemote)
    this.shadowRoot.getElementById("new-key-btn").addEventListener("click", this.newKey)

    this.shadowRoot.getElementById("remotes").addEventListener("item-clicked", e => {
      let id = e.detail.menu.closest("tr.remote")?.getAttribute("data-id")
      if(!id) return;
      switch(e.detail.button){
        case "delete":
          confirmDialog(`Are you sure that you want to delete the remote titled "${this.remotes.find(f => f.id == id).title}"?`)
              .then(answer => answer ? api.del(`federation/remote/${id}`).then(this.refreshData) : null)
          break;
      }
    })

    this.shadowRoot.getElementById("apikeys").addEventListener("item-clicked", e => {
      let id = e.detail.menu.closest("tr")?.getAttribute("data-id")
      if(!id) return;
      switch(e.detail.button){
        case "delete":
          confirmDialog(`Are you sure that you want to delete this API key?`)
              .then(answer => answer ? api.del(`system/apikeys/${id}`).then(this.refreshData) : null)
          break;
      }
    })
  }

  async refreshData(){

    let remotes = this.remotes = await api.get("federation/remote")

    this.shadowRoot.getElementById("remotes").innerHTML = remotes.sort((a,b) => a.title < b.title ? -1 : 1).map(r => `
      <tr data-id="${r.id}" class="remote result">
        <td>
          <span class="remote-name">
            <field-ref ref="/federation/remote/${r.id}">${r.title}</field-ref>
          </span>
        </td>
        <td>
          <a href="${r.url}">${r.url}</a>
        </td>
        <td>
          <context-menu width="150px">
            <span data-button="delete">Delete remote</span>
          </context-menu>
        </td>
      </tr>
    `).join("")

    let roles = await api.get("federation/setup/role")
    this.shadowRoot.getElementById("roles").innerHTML = roles.sort((a, b) => a.id.toLowerCase() < b.id.toLowerCase() ? -1 : 1).map(role =>  ` 
      <tr class="result">
        <td>${role.id}</td>
        <td><field-edit type="checkbox" field="enabled" patch="federation/setup/role/${role.id}" value="${role.enabled?"true":"false"}"></field-edit></td>
      </tr>
    `).join("")

    let keys = await api.get("federation/setup/apikey")
    this.shadowRoot.getElementById("apikeys").innerHTML = keys.sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1).map(key =>  ` 
      <tr data-id="${key.id}" class="result">
        <td>${key.id}</td>
        <td>${key.name}</td>
        <td>${key.userId}</td>
        <td>${key.issueDate?.substring(0, 19).replace("T", " ") ||"N/A"}</td>
        <td>
          <context-menu width="150px">
            <span data-button="delete">Delete key</span>
          </context-menu>
        </td>
      </tr>
    `).join("")
  }

  newRemote(){
    let dialog = this.shadowRoot.querySelector("#new-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#new-title").focus(),
      ok: async (val) => {
        await api.post(`federation/remote`, val)
        this.refreshData()
      },
      validate: async (val) => 
          !val.title ? "Please fill out title"
        : !val.url ? "Please fill out URL"
        : !val.apiKey ? "Please fill out API Key"
        : (await api.post(`federation/remote/test`, val)).error || true,
      values: () => {return {
        title: this.shadowRoot.getElementById("new-title").value,
        url: this.shadowRoot.getElementById("new-url").value,
        apiKey: this.shadowRoot.getElementById("new-apiKey").value
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  async newKey(){
    let dialog = this.shadowRoot.querySelector("#newkey-dialog")

    showDialog(dialog, {
      show: async () => {
        this.shadowRoot.querySelector("#newkey-name").focus()
        this.shadowRoot.querySelector("#newkey-key").value = uuidv4()
        this.shadowRoot.querySelector("#newkey-user").value = (await getUser()).id
      },
      ok: async (val) => {
        await api.post("federation/setup/apikey", val)
        this.refreshData()
      },
      validate: (val) => 
          !val.name ? "Please fill out name"
        : !val.key ? "Please fill out key"
        : !val.userId ? "Please fill out user"
        : true,
      values: () => {return {
        name: this.shadowRoot.getElementById("newkey-name").value,
        key: this.shadowRoot.getElementById("newkey-key").value,
        userId: this.shadowRoot.getElementById("newkey-user").value
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  connectedCallback() {
    on("changed-page", elementName, this.refreshData)

    api.get("user").then((users) => {
      this.shadowRoot.getElementById("users").innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join("");
    })
  }

  disconnectedCallback() {
    off("changed-page", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}