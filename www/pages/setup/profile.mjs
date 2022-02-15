const elementName = 'profile-page'

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
      <action-bar-item id="changepass">Change password</action-bar-item>
  </action-bar>

  <div id="container">
    <h3>My profile</h3>

    <field-list labels-pct="20">
      <field-edit type="text" label="Name" id="name" disabled></field-edit>
    </field-list>
  </div>


  <dialog-component title="Change password" id="pass-dialog">
  <field-component label="Existing"><input type="password" id="pass-existing"></input></field-component>
  <field-component label="New"><input type="password" id="pass-new"></input></field-component>
</dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.changePass = this.changePass.bind(this)
    this.refreshData = this.refreshData.bind(this)

    this.refreshData();
    this.shadowRoot.getElementById("changepass").addEventListener("click", this.changePass)
  }

  async changePass(){
    let dialog = this.shadowRoot.querySelector("#pass-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#pass-existing").focus(),
      ok: async (val) => {
        let res = await api.post(`me/changepass`, val)
        if(res?.error){
          fire("log", {level: "error", message: res.error})
          return;
        }
        this.refreshData()
      },
      validate: (val) => 
          !val.existingPass ? "Please fill out existing password"
        : !val.newPass ? "Please fill out new password"
        : true,
      values: () => {return {
        existingPass: this.shadowRoot.getElementById("pass-existing").value,
        newPass: this.shadowRoot.getElementById("pass-new").value
      }},
      close: () => {name
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  async refreshData(){
    let id = this.userId;

    let user = (await api.query(`{me {id, name, passwordSet, msUsers{email, vsts}, roles, active}}`)).me
    if(!user){alertDialog("could not retrive user"); return;}

    this.shadowRoot.getElementById("name").setAttribute("value", user.name);
    
    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `user/${user.id}`));
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}