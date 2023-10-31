const elementName = 'role-page'

import api from "../../system/api.mjs"
import {state} from "../../system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='../css/global.css'>
  <style>
    #container{
        padding: 10px;
        position: relative;
    }
    field-list{
      width: 500px;
    }
  </style>

  <div id="container">
    <h3>Role: <span id="role-id"></span></h3>
    <br>

    <h3>Permissions:</h3>
    <table>
      <tbody id="permissions"></tbody>
    </table>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.permClick = this.permClick.bind(this)
    this.refreshData = this.refreshData.bind(this)
    
    this.roleId = /\/setup\/role\/([a-zA-Z0-9\_\-]+)/.exec(state().path)[1]
    this.refreshData();
    this.shadowRoot.getElementById("permissions").addEventListener("change", this.permClick)
  }

  async refreshData(){
    this.shadowRoot.getElementById("role-id").innerText = this.roleId;

    let role = await api.get(`role/${this.roleId}`)
    let permissions = await api.get(`permission`)
    this.shadowRoot.getElementById("permissions").innerHTML = permissions.sort((a, b) => a.id < b.id ? -1 : 1)
                                                                         .map(p => `<tr><td>${p.id}</td><td><input type="checkbox" class="enable-role" ${role.permissions.includes(p.id) ? "checked" : ""}></input></td></tr>`)
                                                                         .join("")
  }

  permClick(e){
    if(e.target.tagName != "INPUT") return;
    if(!e.target.classList.contains("enable-role")) return;
    let id = e.target.closest("tr").querySelector("td:first-child").innerText;
    
    if(e.target.checked)
      api.post(`role/${this.roleId}/permissions`, {id}).then(this.refreshData)
    else
      api.del(`role/${this.roleId}/permissions/${id}`).then(this.refreshData)
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}