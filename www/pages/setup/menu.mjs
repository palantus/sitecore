const elementName = 'menu-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-ref.mjs"
import "/components/field-edit-inline.mjs"
import Toast from "/components/toast.mjs"
import {on, off} from "/system/events.mjs"
import { showDialog, confirmDialog } from "/components/dialog.mjs";

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style>
    #container{
        padding: 10px;
    }
    table{
      margin-top: 5px;
    }
    table thead tr{
      border: 1px solid gray;
    }
    table tbody td, table thead th {
      padding-right: 8px;
    }

  </style>  

  <action-bar>
    <action-bar-item id="new-btn">New item</action-bar-item>
    <action-bar-item id="refresh-btn">Refresh</action-bar-item>
    <action-bar-item id="regen-menu-btn">Re-generate menu</action-bar-item>
    <action-bar-item id="reset-btn">Reset to defaults</action-bar-item>
  </action-bar>

  <div id="container">
    <h1>Main menu items</h1>

    <p>Tip: Delete a custom item by setting its position or title to empty.</p>
    <table>
        <thead>
            <tr>
              <th>Position</th>
              <th>Title</th>
              <th>Target</th>
              <th>Role</th>
              <th>Permission</th>
              <th>Public</th>
              <th>Hide when signed in</th>
              <th>Hide</th>
            </tr>
        </thead>
        <tbody id="mods" class="container">
        </tbody>
    </table>
  </div>

  <dialog-component title="New menu item" id="new-dialog">
    <field-component label="Title"><input id="new-title"></input></field-component>
    <field-component label="Position"><input id="new-path"></input></field-component>
    <field-component label="Target"><input id="new-target"></input></field-component>
  </dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    this.regenMenu = this.regenMenu.bind(this);
    this.resetAll = this.resetAll.bind(this);
    this.newItem = this.newItem.bind(this)

    this.shadowRoot.getElementById("new-btn").addEventListener("click", this.newItem)
    this.shadowRoot.getElementById("refresh-btn").addEventListener("click", this.refreshData)
    this.shadowRoot.getElementById("regen-menu-btn").addEventListener("click", this.regenMenu)
    this.shadowRoot.getElementById("reset-btn").addEventListener("click", this.resetAll)
  }

  async refreshData(){
    let menu = await api.get("system/menu")
    this.shadowRoot.getElementById("mods").innerHTML = menu.sort((a, b) => a.path == b.path ? a.title < b.title ? -1 : 1 : a.path < b.path ? -1 : 1).map(mi => `
      <tr class="mi result" data-id="${mi.id}">
        <td><field-edit-inline type="text" patch="system/menu/item/${mi.id}" field="path" value="${mi.path}"></field-edit-inline></td>
        <td><field-edit-inline type="text" patch="system/menu/item/${mi.id}" field="title" value="${mi.title}"></field-edit-inline></td>
        <td><field-edit-inline type="text" patch="system/menu/item/${mi.id}" field="target" value="${mi.target}"></field-edit-inline></td>
        <td><field-edit-inline type="select" patch="system/menu/item/${mi.id}" field="role" value="${mi.role||""}" lookup="role"></field-edit-inline></td>
        <td><field-edit-inline type="select" patch="system/menu/item/${mi.id}" field="permisson" value="${mi.permisson||""}" lookup="permisson"></field-edit-inline></td>
        <td><field-edit-inline type="checkbox" patch="system/menu/item/${mi.id}" field="public" value="${mi.public}"></field-edit-inline></td>
        <td><field-edit-inline type="checkbox" patch="system/menu/item/${mi.id}" field="hideWhenSignedIn" value="${mi.hideWhenSignedIn}"></field-edit-inline></td>
        <td><field-edit-inline type="checkbox" patch="system/menu/item/${mi.id}" field="hide" value="${mi.hide}"></field-edit-inline></td>
      </context-menu>
      </tr>
    `).join("")
  }

  async regenMenu(){
    await api.post("system/menu/regen")
    this.refreshData()
    new Toast({text: "Menu has been regenerated. Press F5 to see the result."})
  }

  async resetAll(){
    if(!await confirmDialog("Are you sure that you want to revert all customizations?")) return;
    await api.post("system/menu/reset")
    this.refreshData()
  }

  newItem(){
    let dialog = this.shadowRoot.querySelector("#new-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#new-title").focus(),
      ok: async (val) => {
        await api.post(`system/menu/items`, val)
        this.refreshData()
      },
      validate: async (val) => 
          !val.title ? "Please fill out Title"
        : !val.path ? "Please fill out Path"
        : !val.target ? "Please fill out Target"
        : true,
      values: () => {return {
        title: this.shadowRoot.getElementById("new-title").value,
        path: this.shadowRoot.getElementById("new-path").value,
        target: this.shadowRoot.getElementById("new-target").value,
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
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