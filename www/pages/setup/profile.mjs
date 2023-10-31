const elementName = 'profile-page'

import api from "../../system/api.mjs"
import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"
import "../../components/field.mjs"
import "../../components/field-edit.mjs"
import "../../components/field-list.mjs"
import {on, off, fire} from "../../system/events.mjs"
import {showDialog} from "../../components/dialog.mjs"
import { alertDialog } from "../../components/dialog.mjs"
import {getApiConfig} from "../../system/core.mjs"

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

    #custom-mod-container > *{
      margin-top: 15px;
    }
  </style>  

  <action-bar>
      <action-bar-item id="changepass">Change password</action-bar-item>
  </action-bar>

  <div id="container">
    <h1>My profile</h1>

    <field-list labels-pct="20">
      <field-edit type="text" label="Name" id="name" disabled></field-edit>
      <field-edit type="text" label="E-mail" id="email"></field-edit>
      <field-edit type="text" label="Home path" id="home"></field-edit>
    </field-list>

    <div id="custom-mod-container"></div>
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

    let profileComponents = getApiConfig().mods.map(m => m.files.filter(f => /\/user\-profile\-[a-zA-z0-9]+\.mjs/.test(f))).flat();

    for(let path of profileComponents){
      import(`../..${path}`).then(i => {
        let div = document.createElement("div")
        div.innerHTML = `<${i.name}></${i.name}>`
        this.shadowRoot.getElementById("custom-mod-container").appendChild(div)
      })
    }

    setTimeout(() => {
      fire("user-profile-page-created", {
        page: this, 
        container: this.shadowRoot.getElementById("container")
      })
    }, 0)
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
          !val.newPass ? "Please fill out new password"
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
    let user = (await api.query(`{me {id, name, email, passwordSet, msUsers{email, vsts}, roles, active, home}}`)).me
    if(!user){alertDialog("could not retrive user"); return;}

    this.shadowRoot.getElementById("name").setAttribute("value", user.name);
    this.shadowRoot.getElementById("email").setAttribute("value", user.email||"");
    this.shadowRoot.getElementById("home").setAttribute("value", user.home||"");
    
    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `me/setup`));
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