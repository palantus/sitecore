const elementName = 'system-setup-page'

import api from "/system/api.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import {on, off} from "/system/events.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
        padding: 10px;
        position: relative;
    }
    div.group:not(:first-child){
      margin-top: 10px;
    }
    .group input{
      width: 350px;
    }
    field-list{
      width: 600px;
    }
  </style>  

  <div id="container">

    <h1>System setup</h1>

    <h2>General</h2>
    <field-list labels-pct="20">
      <field-edit type="text" label="Site title" id="siteTitle"></field-edit>
      <field-edit type="text" label="Home - public" id="homePublic"></field-edit>
      <field-edit type="text" label="Home - signed in" id="homeInternal"></field-edit>
    </field-list>
    <br><br>

    <h2>Microsoft sign-in support</h2>
    <p>Note: Changing these values requirest a server restart.</p>
    <field-list labels-pct="20">
      <field-edit type="text" label="Client Id" id="msSigninClientId" title="Available from Azure app"></field-edit>
      <field-edit type="text" label="Secret" id="msSigninSecret"></field-edit>
    </field-list>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this); //Make sure "this" in that method refers to this
    
    this.refreshData();
  }

  async refreshData(){

    let setup = await api.get("system/setup")

    this.shadowRoot.getElementById('siteTitle').setAttribute("value", setup.siteTitle||"")
    this.shadowRoot.getElementById('homePublic').setAttribute("value", setup.homePublic||"")
    this.shadowRoot.getElementById('homeInternal').setAttribute("value", setup.homeInternal||"")

    this.shadowRoot.getElementById('msSigninClientId').setAttribute("value", setup.msSigninClientId||"")
    this.shadowRoot.getElementById('msSigninSecret').setAttribute("value", setup.msSigninSecretSet ? "*********" : "")

    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `system/setup`));
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