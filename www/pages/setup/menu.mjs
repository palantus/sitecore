const elementName = 'menu-page'

import api from "../../system/api.mjs"
import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"
import "../../components/field-ref.mjs"
import "../../components/field-edit-inline.mjs"
import Toast from "../../components/toast.mjs"
import {on, off} from "../../system/events.mjs"
import { showDialog, confirmDialog } from "../../components/dialog.mjs";
import { saveFileJSON } from "../../libs/file.mjs"
import { siteTitle } from "../../system/core.mjs"
import { alertDialog } from "../../components/dialog.mjs"

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
    <action-bar-item id="export-btn">Export</action-bar-item>
    <action-bar-item id="import-btn">Import</action-bar-item>
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
              <th>Module</th>
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

  <dialog-component title="Import" id="import-dialog">
    <input type="file">
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
    this.newItem = this.newItem.bind(this);
    this.export = this.export.bind(this);
    this.import = this.import.bind(this);

    this.shadowRoot.getElementById("new-btn").addEventListener("click", this.newItem)
    this.shadowRoot.getElementById("refresh-btn").addEventListener("click", this.refreshData)
    this.shadowRoot.getElementById("regen-menu-btn").addEventListener("click", this.regenMenu)
    this.shadowRoot.getElementById("reset-btn").addEventListener("click", this.resetAll)
    this.shadowRoot.getElementById("export-btn").addEventListener("click", this.export);
    this.shadowRoot.getElementById("import-btn").addEventListener("click", this.import);
  }

  async refreshData(){
    let menu = this.menu = await api.get("system/menu")
    this.shadowRoot.getElementById("mods").innerHTML = menu.sort((a, b) => a.path == b.path ? a.title < b.title ? -1 : 1 : a.path < b.path ? -1 : 1).map(mi => `
      <tr class="mi result" data-id="${mi.id}">
        <td><field-edit-inline type="text" patch="system/menu/item/${mi.id}" field="path" value="${mi.path}"></field-edit-inline></td>
        <td><field-edit-inline type="text" patch="system/menu/item/${mi.id}" field="title" value="${mi.title}"></field-edit-inline></td>
        <td><field-edit-inline type="text" patch="system/menu/item/${mi.id}" field="target" value="${mi.target}"></field-edit-inline></td>
        <td>${mi.type != "auto" ? "" : mi.owner}</td>
        <td><field-edit-inline type="select" patch="system/menu/item/${mi.id}" field="role" value="${mi.role||""}" lookup="role"></field-edit-inline></td>
        <td><field-edit-inline type="select" patch="system/menu/item/${mi.id}" field="permission" value="${mi.permission||""}" lookup="permission"></field-edit-inline></td>
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

  export(){
    let title = siteTitle().replace(/^\s+|\s+$/g, '') // trim
                           .replace(/\//g, '-') //Replace / with -
                           .replace(/[^a-zA-Z0-9 -]/g, '') // remove invalid chars
                           .replace(/\s+/g, '-') // collapse whitespace and replace by -
                           .replace(/-+/g, '-'); // collapse dashes
    saveFileJSON(this.menu, `${title}_menu_${new Date().toISOString()}.json`)
  }

  import(){
    let dialog = this.shadowRoot.getElementById("import-dialog")
    showDialog(dialog, {
      show: () => {
        dialog.querySelector("input").focus();
      },
      ok: async (val) => {
        let formData = new FormData();
        let file = dialog.querySelector("input[type=file]").files[0]
        if(!file) return;
        formData.append("file", file);
        
        let r = new FileReader();
        r.onload = async (e) => {
          try{
            let menu = JSON.parse(e.target.result);
            this.importMenu(menu)
          } catch(err){
            console.log(err)
            alertDialog("Could not parse file. Invalid file format.")
          }
        };
        r.readAsText(file);
      },
    })
  }

  async importMenu(rMenu){
    let changes = []
    for(let rItem of rMenu){
      let lItem = null;
      let potentialLocalItems = this.menu.filter(i => i.target == rItem.target && i.type == rItem.type && i.owner == rItem.owner)
      if(potentialLocalItems.length > 1){
        lItem = potentialLocalItems.find(i => i.title == rItem.title)
      } else {
        lItem = potentialLocalItems[0] || null
      }
      
      if(!lItem){
        changes.push({type: "new", rItem})
        continue;
      }

      if(rItem.type != lItem.type)
        changes.push({type: "diff", rItem, lItem, field: "type"})

      if(rItem.title != lItem.title)
        changes.push({type: "diff", rItem, lItem, field: "title"})

      if(rItem.path != lItem.path)
        changes.push({type: "diff", rItem, lItem, field: "path"})

      if(rItem.public != lItem.public)
        changes.push({type: "diff", rItem, lItem, field: "public"})

      if(rItem.hideWhenSignedIn != lItem.hideWhenSignedIn)
        changes.push({type: "diff", rItem, lItem, field: "hideWhenSignedIn"})

      if(rItem.role != lItem.role)
        changes.push({type: "diff", rItem, lItem, field: "role"})

      if(rItem.permission != lItem.permission)
        changes.push({type: "diff", rItem, lItem, field: "permission"})

      if(rItem.hide != lItem.hide)
        changes.push({type: "diff", rItem, lItem, field: "hide"})
    }

    if(!(await confirmDialog(`
      Changed items:
      <br>
      <pre>${changes.filter(c => c.type == "diff").map(c => `${c.lItem.path}/${c.lItem.title}: Modified ${c.field}`).join("<br>")}</pre>
      <br>
      New items:
      <br>
      <pre>${changes.filter(c => c.type == "new").map(c => `${c.rItem.path}/${c.rItem.title} => ${c.rItem.target}`).join("<br>")}</pre>
      `, "Confirm import"))) return;

    for(let c of changes){
      if(c.type == "diff"){
        let change = {}
        change[c.field] = c.rItem[c.field]
        await api.patch(`system/menu/item/${c.lItem.id}`, change)
      }
    }

    if(changes.find(c => c.type == "new")){
      alertDialog("New menu items was skipped as importing these haven't been implemented yet")
    }
    
    new Toast({text: "Import successful. Please re-generate the menu to see the result."})

    this.refreshData();
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