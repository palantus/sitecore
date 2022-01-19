const elementName = 'users-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-ref.mjs"
import "/components/field-edit.mjs"
import "/components/field.mjs"
import {showDialog} from "/components/dialog.mjs"
import {on, off, fire} from "/system/events.mjs"
import {goto} from "/system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style>
    #container{
        padding: 10px;
        /*padding-top: 55px;*/
        position: relative;
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
    table thead th:nth-child(2){width: 150px}
    table thead th:nth-child(3){width: 150px}
  </style>  

  <action-bar>
      <action-bar-item id="new-btn">New User</action-bar-item>
      <action-bar-item id="msusers-btn">Microsoft users</action-bar-item>
      <action-bar-item id="roles-btn">Roles</action-bar-item>
  </action-bar>

  <div id="container">
    <label for="showinactive">Show inactive</label>
    <input type="checkbox" id="showinactive"></input>
    <table>
        <thead>
            <tr>
              <th>Id</th>
              <th>Name</th>
              <th>Roles</th>
              <th>MS Users</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>

    <dialog-component title="New User" id="newuser-dialog">
      <field-component label="User id"><input id="newuser-id"></input></field-component>
      <field-component label="Name"><input id="newuser-name"></input></field-component>
    </dialog-component>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.newUser = this.newUser.bind(this); //Make sure "this" in that method refers to this
    this.refreshData = this.refreshData.bind(this); //Make sure "this" in that method refers to this
    
    this.shadowRoot.querySelector("#new-btn").addEventListener("click", this.newUser)
    this.shadowRoot.querySelector("#msusers-btn").addEventListener("click", () => goto("/setup/msusers"))
    this.shadowRoot.querySelector("#roles-btn").addEventListener("click", () => goto("/setup/roles"))
    this.shadowRoot.getElementById("showinactive").addEventListener("change", this.refreshData)

    this.refreshData();
  }

  async newUser(){
    let dialog = this.shadowRoot.querySelector("#newuser-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#newuser-id").focus(),
      ok: async (val) => {
        await api.post("user", val)
        this.refreshData()
      },
      validate: (val) => 
          !val.id ? "Please fill out user id"
        : !val.name ? "Please fill out name"
        : true,
      values: () => {return {
        id: this.shadowRoot.getElementById("newuser-id").value,
        name: this.shadowRoot.getElementById("newuser-name").value
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  async refreshData(){    
    let fields = "id, name, msUsers{email}, roles"
    let users;
    if(this.shadowRoot.getElementById("showinactive").checked){
      users = (await api.query(`{users {${fields}}}`)).users
    } else {
      users = (await api.query(`{usersActive {${fields}}}`)).usersActive
    }

    let tab = this.shadowRoot.querySelector('table tbody')
    tab.innerHTML = "";

    for(let user of users.sort((a, b) => a.id < b.id ? -1 : 1)){
        let row = document.createElement("tr")
        row.classList.add("result")
        row.innerHTML = `
            <tr>
                <td><field-ref ref="/setup/users/${user.id}"/>${user.id}</field-ref></td>
                <td>${user.name}</td>
                <td>${user.roles.join(", ")}</td>
                <td>${user.msUsers.map(u => u.email).join(", ")}</td>
            </tr>
        `
        tab.appendChild(row);
    }
  }

  connectedCallback() {
    on("changed-project", "users", this.refreshData)
    on("changed-page", "users", this.refreshData)
  }

  pagerPageChange({detail:{page, start, end}}){
  }

  disconnectedCallback() {
    off("changed-project", "users")
    off("changed-page", "users")
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}