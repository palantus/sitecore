const elementName = 'federation-remote-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import {on, off} from "/system/events.mjs"
import {state} from "/system/core.mjs"
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
    <action-bar-item id="test">Test connection</action-bar-item>
  </action-bar>

  <div id="container">
    <h1>Remote: <span id="remote-title"></span></h1>

    <field-list labels-pct="20">
      <field-edit type="text" label="Title" id="title"></field-edit>
      <field-edit type="text" label="URL" id="url"></field-edit>
      <field-edit type="text" label="API Key" id="apiKey"></field-edit>
    </field-list>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this)
    this.testConn = this.testConn.bind(this)
    
    this.remoteId = /\/federation\/remote\/([\d]+)/.exec(state().path)[1]

    this.shadowRoot.getElementById("test").addEventListener("click", this.testConn)

    this.elementId = `${elementName}-${this.userId}`
  }

  async refreshData(){
    let remote = this.remote = await api.get(`federation/remote/${this.remoteId}`)

    this.shadowRoot.getElementById("remote-title").innerText = remote.title;

    this.shadowRoot.getElementById("title").setAttribute("value", remote.title);
    this.shadowRoot.getElementById("url").setAttribute("value", remote.url);
    this.shadowRoot.getElementById("apiKey").setAttribute("value", remote.apiKey);

    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `federation/remote/${remote.id}`));
  }

  async testConn(){
    let result = await api.post(`federation/remote/${this.remoteId}/test`)
    if(!result || !result.success) alertDialog(`Conneciton unsuccessful. Error details: ${JSON.stringify(result.error)}`)
    else alertDialog(`Successfully logged in as user ${result.userId} (${result.name})`)
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