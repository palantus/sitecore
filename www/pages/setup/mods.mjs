const elementName = 'mods-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-ref.mjs"
import "/components/field.mjs"
import "/components/field-edit.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import Toast from "/components/toast.mjs"
import {on, off} from "/system/events.mjs"
import {goto} from "/system/core.mjs"
import { alertDialog, confirmDialog } from "/components/dialog.mjs"
import { restartServer } from "./setup.mjs"

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

    table thead th:nth-child(1){width: 100px}
    table thead th:nth-child(2){width: 70px}
    table thead th:nth-child(3){width: 70px}
    table thead th:nth-child(4){width: 130px}
  </style>  

  <action-bar>
    <action-bar-item id="shop-btn">Mod shop</action-bar-item>
    <action-bar-item id="update-check-btn">Check for updates</action-bar-item>
    <action-bar-item id="restart-server-btn">Restart server</action-bar-item>
  </action-bar>

  <div id="container">
    <h1>Server mods</h1>

    <table>
        <thead>
            <tr>
              <th>Id</th>
              <th>Enabled</th>
              <th>Version</th>
              <th>Update available</th>
              <th></th>
            </tr>
        </thead>
        <tbody id="mods" class="container">
        </tbody>
    </table>

    <p>Note: Enabling/disabling mods only has an effect after the server is restarted.</p>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    this.clicked = this.clicked.bind(this)
    this.checkForUpdates = this.checkForUpdates.bind(this)

    this.shadowRoot.getElementById("update-check-btn").addEventListener("click", this.checkForUpdates)
    this.shadowRoot.getElementById("restart-server-btn").addEventListener("click", () => restartServer())
    this.shadowRoot.getElementById("shop-btn").addEventListener("click", () => goto("/setup/shop"))

    this.shadowRoot.getElementById("mods").addEventListener("click", this.clicked)
  }

  async refreshData(){
    let mods = await api.get("system/mods/installed")
    this.shadowRoot.getElementById("mods").innerHTML = mods.sort((a, b) => a.id < b.id ? -1 : 1).map(m => `
      <tr class="mod result" data-id="${m.id}">
        <td>${(m.hasSetup && m.enabled) ? `<field-ref ref="/${m.id}/setup">${m.id}</field-ref>` : `${m.id}`}</td>
        <td><field-edit field="enabled" type="checkbox" patch="system/mod/${m.id}" value="${m.enabled ? "true" : "false"}"></field-edit></td>
        <td>${m.versionInstalled||""}</td>
        <td>${m.updateAvailable ? `<span style="color: green">Available!</span>` : ""}</td>
        <td>
            <button class="update">Update</button>
            <button class="uninstall">Uninstall</button>
        </td>
      </context-menu>
      </tr>
    `).join("")
  }

  async clicked(e){
    let id = e.target.closest(".mod").getAttribute("data-id")
    if(e.target.classList.contains("setupbtn")){
      goto(`/${id}/setup`)
    } else if(e.target.classList.contains("update")){
      e.target.toggleAttribute("disabled", true)
      let toast = new Toast({text: `Updating ${id}...`, showProgress: false})
      await api.post(`system/mod/${id}/update`)
      toast.remove()
      new Toast({text: `${id} has been updated!`})
      this.refreshData()
      e.target.toggleAttribute("disabled", false)
    } else if(e.target.classList.contains("uninstall")){
      if(!(await (confirmDialog(`Are you sure that you want to uninstall mod ${id}?`, {title: "Uninstall mod"})))) return;
      e.target.toggleAttribute("disabled", true)
      let toast = new Toast({text: `Uninstalling ${id}...`, showProgress: false})
      await api.post(`system/mod/${id}/uninstall`)
      toast.remove()
      new Toast({text: `${id} has been uninstalled. Please restart the server.`})
      this.refreshData()
      e.target.toggleAttribute("disabled", false)
    }
  }

  async checkForUpdates(){
    let toast = new Toast({text: "Checking for updates...", showProgress: false})
    toast.pause()
    await api.post("system/mods/update-check")
    toast.text = "Finished update check"
    toast.showProgress = true
    toast.unpause()
    await this.refreshData()

    //Also check for Core updates
    let res = await api.post("system/update-check")
    if(res.updateAvailable) new Toast({text: "A new Core update is available. Please consider updating Core before mods.", autoClose: 10000})
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