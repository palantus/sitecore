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
    <field-list labels-pct="20">
      <field-edit type="text" label="Site title" id="siteTitle"></field-edit>
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