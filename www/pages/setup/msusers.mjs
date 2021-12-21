const elementName = 'msusers-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-ref.mjs"
import "/components/field-edit.mjs"
import "/components/field.mjs"
import {showDialog} from "/components/dialog.mjs"
import {on, off, fire} from "/system/events.mjs"

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

    table thead th:nth-child(1){width: 250px}
    table thead th:nth-child(2){width: 250px}
    table thead th:nth-child(3){width: 350px}
    table thead th:nth-child(4){width: 150px}
  </style>  

  <action-bar>
      <action-bar-item id="new-btn">New Microsoft User</action-bar-item>
  </action-bar>

  <div id="container">
    <table>
        <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Id</th>
              <th>Mapped user</th>
              <th>VSTS</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>

    <dialog-component title="New Microsoft User" id="newuser-dialog">
      <field-component label="User email"><input id="newuser-email"></input></field-component>
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

    this.refreshData();
  }

  async newUser(){
    let dialog = this.shadowRoot.querySelector("#newuser-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#newuser-email").focus(),
      ok: async (val) => {
        await api.post("msuser", val)
        this.refreshData()
      },
      validate: (val) => 
          !val.email ? "Please fill out user email"
        : true,
      values: () => {return {
        email: this.shadowRoot.getElementById("newuser-email").value
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  async refreshData(){    
    let msUsers = (await api.query(`{msUsers{id, email, name, user{id, name}, vsts}}`)).msUsers

    this.shadowRoot.querySelector('table tbody').innerHTML = msUsers.map(user => `
            <tr class="result">
              <td>${user.email}</td>
              <td>${user.name||""}</td>
              <td>${user.id||""}</td>
              <td><field-ref ref="/setup/users/${user.user?.id}"/>${user.user?.id||""}</field-ref></td>
              <td><field-edit type="checkbox" field="vsts" label="Enable" patch="msuser/${user.email}" value="${user.vsts}"></field-edit></td>
            </tr>
    `).join("")
  }

  connectedCallback() {
    on("changed-project", "users", this.refreshData)
    on("changed-page", "users", this.refreshData)
  }

  disconnectedCallback() {
    off("changed-project", "users")
    off("changed-page", "users")
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}