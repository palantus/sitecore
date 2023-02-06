const elementName = 'federation-page'

import api from "/system/api.mjs"
import {on, off} from "/system/events.mjs"
import "/components/field-ref.mjs"
import "/components/field-edit.mjs"
import "/components/context-menu.mjs"
import "/components/collapsible-card.mjs"
import {showDialog, confirmDialog} from "/components/dialog.mjs"

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

    #remotes-tab thead tr{
      border-bottom: 1px solid var(--contrast-color-muted);
    }
    #remotes-tab tbody td{padding-top: 5px;padding-bottom:5px;}
    
    .hidden{display: none;}
    .remote-action-buttons{margin-top: 10px;}
    collapsible-card > div{
      padding: 10px;
    }
    collapsible-card{
      margin-bottom: 10px;
      display: block;
    }
  </style>

  <div id="container">
    <h1>Federation</h1>
    
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
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
   
    this.refreshData = this.refreshData.bind(this)
    this.newRemote = this.newRemote.bind(this)

    this.shadowRoot.getElementById("new-remote-btn").addEventListener("click", this.newRemote)

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

  connectedCallback() {
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}