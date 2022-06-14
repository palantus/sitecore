const elementName = 'user-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import {on, off, fire} from "/system/events.mjs"
import {state, goto} from "/system/core.mjs"
import {showDialog} from "/components/dialog.mjs"
import { alertDialog } from "../../components/dialog.mjs"
import { getApiConfig, isMobile } from "../../system/core.mjs"
import {getUser} from "/system/user.mjs"

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
    h1{position: relative; margin-bottom: 20px;}
    #user-id-container{
      font-size: 10pt; 
      color: gray; 
      position: absolute;
      left: 0px;
      top: calc(100% - 5px);
    }
    .hidden{display:none;}
  </style>  

  <action-bar>
      <action-bar-item id="msuser-btn">Assign to MS user</action-bar-item>
      <action-bar-item id="change-username-btn">Change user id</action-bar-item>
  </action-bar>

  <div id="container">
    <h1><span id="user-name"></span><span id="user-id-container"> (<span id="user-id"></span>)</span></h1>

    <field-list labels-pct="20">
      <field-edit type="text" label="Name" id="name"></field-edit>
      <field-edit type="text" label="Email" id="email"></field-edit>
      <field-edit type="password" label="Password" id="password"></field-edit>
      <field-edit type="checkbox" label="Active" id="active"></field-edit>
    </field-list>
    
    <div id="roles-container">
      <br/>
      <h3>Roles</h3>
      <table>
        <tbody id="roles"></tbody>
      </table>
    </div>

    <div id="ms-container">
      <br/>
      <h3>Microsoft users:</h3>
      <div id="msusers"></div>
    </div>

    <dialog-component title="Assign user to MS user" id="msuser-dialog">
      <field-component label="MS email or id"><input list="emails" id="msuser-email"></input></field-component>
    </dialog-component>
  </div>
    
  <datalist id="emails">
  </datalist>

  <dialog-component title="Change user id" id="change-username-dialog">
    <p>This can cause problems with eg. permission filters (ACLs) etc. Make sure that you know what you are doing.</p>

    <field-component label="Existing"><input type="text" id="user-existing"></input></field-component>
    <field-component label="New"><input type="text" id="user-new"></input></field-component>
  </dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.assignToMSUser = this.assignToMSUser.bind(this); //Make sure "this" in that method refers to this
    this.changeUsername = this.changeUsername.bind(this)
    this.roleClick = this.roleClick.bind(this)
    this.refreshData = this.refreshData.bind(this)
    
    this.userId = /\/setup\/users\/([a-zA-Z0-9\-_@&.]+)/.exec(state().path)[1]
    this.shadowRoot.getElementById("msuser-btn").addEventListener("click", this.assignToMSUser)
    this.shadowRoot.getElementById("change-username-btn").addEventListener("click", this.changeUsername)
    this.shadowRoot.getElementById("roles").addEventListener("change", this.roleClick)

    this.elementId = `${elementName}-${this.userId}`

    setTimeout(() => {
      fire("user-page-created", {
        page: this, 
        container: this.shadowRoot.getElementById("container"), 
        userId: this.userId
      })
    }, 0)
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
        let res = await api.post(`user/${this.userId}/assignToMSAccount`, val)
        if(res?.error){
          fire("log", {level: "error", message: res.error})
          return;
        }
        this.refreshData()
      },
      validate: (val) => 
          !val.msid ? "Please fill out email"
        : true,
      values: () => {return {
        msid: this.shadowRoot.getElementById("msuser-email").value,
        createIfMissing: true
      }},
      close: () => {name
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  async changeUsername(){
    let dialog = this.shadowRoot.querySelector("#change-username-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#user-existing").focus(),
      ok: async (val) => {
        let res = await api.post(`user/${this.userId}/change-id`, val)
        if(res?.error){
          fire("log", {level: "error", message: res.error})
          return;
        }
        goto(`/setup/users/${val.newId}`)
      },
      validate: (val) => 
          !val.newId ? "Please fill out new id"
        : !val.oldId ? "Please fill out old id"
        : val.newId == val.oldId ? "Old and new are the same"
        : val.oldId != this.userId ? "Incorrect existing user id"
        : true,
      values: () => {return {
        oldId: this.shadowRoot.getElementById("user-existing").value,
        newId: this.shadowRoot.getElementById("user-new").value
      }},
      close: () => {name
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  async refreshData(){
    let id = this.userId;

    let user = (await api.query(`{user(id:"${id}") {id, name, email, passwordSet, msUsers{email, vsts}, roles, active}}`)).user
    if(!user){alertDialog(`Could not retrive user ${id}. Maybe you don't have permission to view this user.`); return;}

    let me = await getUser()
    let isShowingMe = me.id == user.id;
    let isAdmin = me.permissions.includes("admin")

    this.shadowRoot.getElementById("user-id").innerText = user.id;
    this.shadowRoot.getElementById("user-name").innerText = user.name;
    this.shadowRoot.getElementById("name").setAttribute("value", user.name);
    this.shadowRoot.getElementById("email").setAttribute("value", user.email||"");
    this.shadowRoot.getElementById("password").setAttribute("value", user.passwordSet ? "12345678" : "");
    this.shadowRoot.getElementById("active").setAttribute("value", user.active);
    
    if(isAdmin || isShowingMe){
      this.shadowRoot.getElementById("msusers").innerHTML = user.msUsers.map(u => u.vsts ? `${u.email} (vsts)` : u.email).join("<br/>") || "- None -"
      this.shadowRoot.getElementById("ms-container").classList.toggle("hidden", false);
    } else {
      this.shadowRoot.getElementById("ms-container").classList.toggle("hidden", true);
    }

    if(isAdmin){
      let roles = await api.get("role")
      this.shadowRoot.getElementById("roles").innerHTML = roles.sort((a, b) => a.id < b.id ? -1 : 1)
                                                              .map(r => `<tr data-roleid="${r.id}"><td><field-ref ref="/setup/role/${r.id}">${r.id}</field-ref></td><td><input type="checkbox" class="enable-role" ${user.roles.includes(r.id) ? "checked" : ""}></input></td></tr>`).join("")
      this.shadowRoot.getElementById("roles-container").classList.toggle("hidden", false);
    } else {
      this.shadowRoot.getElementById("roles-container").classList.toggle("hidden", true);
    }
    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `user/${user.id}`));
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