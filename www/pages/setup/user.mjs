const elementName = 'user-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import {on, off, fire} from "/system/events.mjs"
import {state} from "/system/core.mjs"
import {showDialog} from "/components/dialog.mjs"
import { alertDialog } from "../../components/dialog.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
        padding: 10px;
        position: relative;
    }
    field-list{
      width: 500px;
    }
  </style>  

  <action-bar>
      <action-bar-item id="msuser-btn">Assign to MS user</action-bar-item>
  </action-bar>

  <div id="container">
    <h3>User <span id="user-id"></span></h3>

    <field-list labels-pct="20">
      <field-edit type="text" label="Name" id="name"></field-edit>
      <field-edit type="password" label="Password" id="password"></field-edit>
      <field-edit type="checkbox" label="Active" id="active"></field-edit>
    </field-list>
    
    <br/>
    <br/>

    <h3>Roles</h3>
    <table>
      <tbody id="roles"></tbody>
    </table>

    <br/>
    <br/>

    <br/>
    <h3>Microsoft users:</h3>
    <div id="msusers"></div>

    <dialog-component title="Assign user to MS user" id="msuser-dialog">
      <field-component label="MS email or id"><input list="emails" id="msuser-email"></input></field-component>
    </dialog-component>
  </div>
    
  <datalist id="emails">
  </datalist>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.assignToMSUser = this.assignToMSUser.bind(this); //Make sure "this" in that method refers to this
    this.roleClick = this.roleClick.bind(this)
    this.refreshData = this.refreshData.bind(this)
    
    this.userId = /\/setup\/users\/([a-z0-9\_\-]+)/.exec(state().path)[1]
    this.refreshData();
    this.shadowRoot.querySelector("#msuser-btn").addEventListener("click", this.assignToMSUser)
    this.shadowRoot.getElementById("roles").addEventListener("change", this.roleClick)

    this.elementId = `${elementName}-${this.userId}`

    fire("user-page-created", {
      page: this, 
      container: this.shadowRoot.getElementById("container"), 
      userId: this.userId
    })
  }

  async assignToMSUser(){
    let dialog = this.shadowRoot.querySelector("#msuser-dialog")

    api.query(`{
      unassignedMSUsers{
        email
      }
    }`).then(data => {
      this.shadowRoot.getElementById("emails").innerHTML = data.unassignedMSUsers.map(u => `<option>${u.email}</option>`).join("");
    })

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#msuser-email").focus(),
      ok: async (val) => {
        let res = await api.post(`user/${this.userId}/assignToMSAccount/${val.email}`, val)
        if(res?.error){
          fire("log", {level: "error", message: res.error})
          return;
        }
        this.refreshData()
      },
      validate: (val) => 
          !val.email ? "Please fill out email"
        : true,
      values: () => {return {
        email: this.shadowRoot.getElementById("msuser-email").value
      }},
      close: () => {name
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  async refreshData(){
    let id = this.userId;

    let user = (await api.query(`{user(id:"${id}") {id, name, passwordSet, msUsers{email, vsts}, roles, active}}`)).user
    if(!user){alertDialog("could not retrive user"); return;}

    this.shadowRoot.getElementById("user-id").innerText = user.id;
    this.shadowRoot.getElementById("name").setAttribute("value", user.name);
    this.shadowRoot.getElementById("password").setAttribute("value", user.passwordSet ? "12345678" : "");
    this.shadowRoot.getElementById("active").setAttribute("value", user.active);
    
    this.shadowRoot.getElementById("msusers").innerHTML = user.msUsers.map(u => u.vsts ? `${u.email} (vsts)` : u.email).join("<br/>")
    
    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `user/${user.id}`));

    let roles = await api.get("role")
    this.shadowRoot.getElementById("roles").innerHTML = roles.sort((a, b) => a.id < b.id ? -1 : 1)
                                                             .map(r => `<tr data-roleid="${r.id}"><td><field-ref ref="/setup/role/${r.id}">${r.id}</field-ref></td><td><input type="checkbox" class="enable-role" ${user.roles.includes(r.id) ? "checked" : ""}></input></td></tr>`).join("")
  }

  roleClick(e){
    if(e.target.tagName != "INPUT") return;
    if(!e.target.classList.contains("enable-role")) return;
    let id = e.target.closest("tr").getAttribute("data-roleid");
    if(!id) alert("Invalid role")
    
    if(e.target.checked)
      api.post(`user/${this.userId}/roles`, {id}).then(this.refreshData)
    else
      api.del(`user/${this.userId}/roles/${id}`).then(this.refreshData)
  }

  connectedCallback() {
    on("changed-page", this.elementI, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", this.elementI)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}