const elementName = 'mods-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-ref.mjs"
import "/components/field.mjs"
import "/components/field-edit.mjs"
import "/components/context-menu.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import Toast from "/components/toast.mjs"
import {on, off} from "/system/events.mjs"
import {goto} from "/system/core.mjs"
import { alertDialog, confirmDialog } from "/components/dialog.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style>
    #container{
        padding: 10px;
    }
    table{
      width: 100%;
      margin-top: 5px;
    }
    table thead tr{
      border: 1px solid gray;
    }

    table thead th:nth-child(1){width: 100px}
    table thead th:nth-child(2){width: 70px}
    table thead th:nth-child(3){width: 70px}
    table thead th:nth-child(4){width: 90px}
  </style>  

  <action-bar>
    <action-bar-item id="shop-btn">Mod shop</action-bar-item>
    <action-bar-item id="update-check-btn">Check for updates</action-bar-item>
    <action-bar-item id="restart-server-btn">Restart server</action-bar-item>
  </action-bar>

  <div id="container">
    <h1>Server mods</h1>
    <p>Note: Enabling/disabling mods only has an effect after the server is restarted.</p>

    <table>
        <thead>
            <tr>
              <th>Id</th>
              <th>Enabled</th>
              <th>Version</th>
              <th>Update</th>
              <th></th>
            </tr>
        </thead>
        <tbody id="mods" class="container">
        </tbody>
    </table>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    this.clicked = this.clicked.bind(this)
    this.modActionClicked = this.modActionClicked.bind(this)
    this.checkForUpdates = this.checkForUpdates.bind(this)
    this.restartServer = this.restartServer.bind(this)

    this.shadowRoot.getElementById("update-check-btn").addEventListener("click", this.checkForUpdates)
    this.shadowRoot.getElementById("restart-server-btn").addEventListener("click", this.restartServer)
    this.shadowRoot.getElementById("shop-btn").addEventListener("click", () => goto("/setup/shop"))

    this.shadowRoot.getElementById("mods").addEventListener("click", this.clicked)
    this.shadowRoot.getElementById("mods").addEventListener("item-clicked", this.modActionClicked)
  }

  async refreshData(){
    let mods = await api.get("system/mods/installed")
    this.shadowRoot.getElementById("mods").innerHTML = mods.sort((a, b) => a.id < b.id ? -1 : 1).map(m => `
      <tr class="mod" data-id="${m.id}">
        <td>${(m.hasSetup && m.enabled) ? `<field-ref ref="/${m.id}/setup">${m.id}</field-ref>` : `${m.id}`}</td>
        <td><field-edit field="enabled" type="checkbox" patch="system/mod/${m.id}" value="${m.enabled ? "true" : "false"}"></field-edit></td>
        <td>${m.versionInstalled||""}</td>
        <td>${m.updateAvailable ? `<span style="color: green">Available!</span>` : ""}</td>
        <td>
          <context-menu width="150px" title="${m.id}">
            <span data-button="update">Update</span>
            <span data-button="uninstall">Uninstall</span>
          </context-menu>
        </td>
      </context-menu>
      </tr>
    `).join("")
  }

  clicked(e){
    if(!e.target.classList.contains("setupbtn")) return;
    goto(`/${e.target.getAttribute("data-mod")}/setup`)
  }

  async modActionClicked(e){
    let container = e.detail.menu.closest(".mod")
    let id = container.getAttribute("data-id")
    if(!id) return;
    switch(e.detail.button){
      case "update": {
        let toast = new Toast({text: `Updating ${id}...`, showProgress: false})
        let res = await api.post(`system/mod/${id}/update`)
        toast.remove()
        new Toast({text: `${id} has been updated!`})
        this.refreshData()
        break;
      }
      case "uninstall": {
        if(!(await (confirmDialog(`Are you sure that you want to uninstall mod ${id}?`, {title: "Uninstall mod"})))) return;
        let toast = new Toast({text: `Uninstalling ${id}...`, showProgress: false})
        let res = await api.post(`system/mod/${id}/uninstall`)
        toast.remove()
        new Toast({text: `${id} has been uninstalled`})
        this.refreshData()
        break;
      }
    }
  }

  async checkForUpdates(){
    let toast = new Toast({text: "Checking for updates...", showProgress: false})
    toast.pause()
    await api.post("system/mods/update-check")
    toast.text = "Finished update check"
    toast.showProgress = true
    toast.unpause()
    this.refreshData()
  }

  async restartServer(){
    if(!(await (confirmDialog("Restarting the server actually just stops it and it is expected that you have some kind of process manager (like pm2) to start it again automatically. Do you want to continue?", {title: "Restart server"})))) return;
    
    let toast = new Toast({text: "Successfully forced a system restart. Awaiting resurrection...", showProgress: false, autoClose: 5000})
    toast.pause()
    await api.post("system/restart")
    await new Promise(resolve => {
      let interval = setInterval(() => {
        api.get("me", {silent: true}).catch(() => null).then(res => {
          if(!res) return;
          clearInterval(interval)
          resolve()
        })
      }, 1000)
    })
    toast.text = "Server restarted sucessfully. Reloading page in 5 seconds..."
    toast.showProgress = true
    toast.unpause()
    setTimeout(() => location.reload(), 5000)
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