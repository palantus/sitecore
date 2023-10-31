const elementName = 'shop-page'

import api from "../../system/api.mjs"
import {on, off} from "../../system/events.mjs"
import "../../components/field-ref.mjs"
import { alertDialog, confirmDialog } from "../../components/dialog.mjs"
import Toast from "../../components/toast.mjs"
import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='../css/global.css'>
  <link rel='stylesheet' href='../css/searchresults.css'>
  <style>
    #container{
        position: relative;
        display: grid;
        grid-template-areas:'left right';
        grid-gap: 0px;
        width: 100%;
        height: 100%;
        grid-template-columns: 520px auto;
    }
    @media only screen and (max-width: 1100px) {
      #container{
        display: initial !important;
      }
    }
    #loading{margin: 10px;}

    #modstab {margin-top: 5px;}
    #modstab thead th:nth-child(1){width: 85px}
    #modstab thead th:nth-child(2){width: 350px}
    #modstab thead th:nth-child(3){width: 85px}
    #modstab thead tr{border-bottom: 1px solid gray;}
    #modstab tbody td{padding-bottom: 5px;}

    #left{grid-area: left; border-right: 1px solid gray;overflow-y: auto;}
    #right{grid-area: right; padding: 10px; overflow-y: auto}
    .result:hover{/*background-color: var(--accent-back-light); */cursor: pointer;}
    .result.selected{background-color: var(--accent-back-light); cursor: pointer;}

    #active-mod{
      margin-top: 10px;
    }
  </style>  

  <action-bar>
    <action-bar-item id="refresh-btn">Refresh list</action-bar-item>
  </action-bar>

  <div id="container">
    <div id="left">
      <div id="loading">
        <h3>Loading available modules from GitHub.com...</h3>
      </div>
      <table id="modstab" class="hidden">
        <thead>
          <tr>
            <th>Id</th>
            <th>Description</th>
            <th>Installed</th>
          </tr>
        </thead>
        <tbody id="mods">
        </tbody>
      </table>
    </div>

    <div id="right">
      <button id="install-btn" class="styled hidden">Install</button>
      <button id="uninstall-btn" class="styled hidden">Uninstall</button>
      <button id="source-btn" class="styled hidden">View source</button>
      <div id="active-mod">
        <p>Select a mod on the list and view the details here. <br>When a mod is selected, you can choose to install it.</p>
      </div>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.modClick = this.modClick.bind(this)
    this.refreshData = this.refreshData.bind(this)
    this.install = this.install.bind(this)
    this.uninstall = this.uninstall.bind(this)

    this.shadowRoot.getElementById("refresh-btn").addEventListener("click", async () => {
      let toast = new Toast({text: `Refreshing list...`, showProgress: false, autoClose: false})
      await api.post("system/mods/refresh-available")
      this.refreshData()
      toast.remove()
      new Toast({text: "Successfully refreshed list of available mods"})
    });
    this.shadowRoot.getElementById("modstab").addEventListener("click", this.modClick);
    this.shadowRoot.getElementById("install-btn").addEventListener("click", this.install);
    this.shadowRoot.getElementById("uninstall-btn").addEventListener("click", this.uninstall);
    this.shadowRoot.getElementById("source-btn").addEventListener("click", () => {
      let mod = this.getSelectedMod()
      window.open(`https://github.com/${mod.github.user}/${mod.github.repo}`)
    });
  }

  connectedCallback() {
    on("changed-project", elementName, this.refreshData)
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-project", elementName)
    off("changed-page", elementName)
  }

  async modClick(e){
    let row;
    if(e.target.tagName == "TD")
      row = e.target.parentElement;
    else if(e.target.tagName == "TR" && e.target.classList.contains("result"))
      row = e.target;
    else
      return;

    this.shadowRoot.querySelectorAll("#mods .result").forEach(e => e.classList.remove("selected"))
    row.classList.add("selected")
    this.refreshSelected();
  }

  async refreshSelected(){
    let mod = this.getSelectedMod()
    this.shadowRoot.getElementById("active-mod").innerHTML = (await api.get(`system/mod/${mod.id}/readme`)).html
    this.shadowRoot.getElementById("install-btn").classList.toggle("hidden", mod.installed)
    this.shadowRoot.getElementById("uninstall-btn").classList.toggle("hidden", !mod.installed)
    this.shadowRoot.getElementById("source-btn").classList.toggle("hidden", false)
  }

  async refreshData(){
    let mods = this.mods = await api.get("system/mods")
    if(mods.length < 2){
      await api.post("system/mods/refresh-available")
      mods = this.mods = await api.get("system/mods")
    }

    this.shadowRoot.getElementById("modstab").classList.remove("hidden")
    this.shadowRoot.getElementById("loading").classList.add("hidden")

    let selectedModRow = this.shadowRoot.querySelector("#mods .result.selected")
    let modidSelected = selectedModRow ? selectedModRow.getAttribute("data-modid") : null;
    this.shadowRoot.getElementById("mods").innerHTML = mods.filter(m => m.id != "sample")
                                                           .sort((a, b) => a.id < b.id ? -1 : 1)
                                                           .map(m => `
      <tr class="result" data-modid="${m.id}">
        <td>${m.id}</td>
        <td>${m.description||""}</td>
        <td>${m.installed ? "Yes" : "No"}</td>
      </tr>
    `).join("")
    
    if(modidSelected){
      this.shadowRoot.querySelector(`#mods .result[data-modid="${modidSelected}"]`)?.classList.add("selected")
      this.refreshSelected()
    }
  }

  getSelectedMod(){
    let selectedModRow = this.shadowRoot.querySelector("#mods .result.selected")
    let modidSelected = selectedModRow ? selectedModRow.getAttribute("data-modid") : null;
    if(!modidSelected) return null;
    return this.mods.find(m => m.id == modidSelected)||null
  }

  async install(){
    let mod = this.getSelectedMod()
    if(!mod) return;
    let toast = new Toast({text: `Installing ${mod.id}...`, showProgress: false})
    let result = await api.post(`system/mod/${mod.id}/install`)
    toast.remove()
    alertDialog(result.success ? "Installation successful!<br><br>Please restart server for the mod to be loaded. This can be done under System -> Mods in the menu." : "Installation failed. Try again.", {title: `Installation of ${mod.id}`})
    this.refreshData();
  }

  async uninstall(){
    let mod = this.getSelectedMod()
    if(!mod) return;
    let toast = new Toast({text: `Uninstalling ${mod.id}...`, showProgress: false})
    await api.post(`system/mod/${mod.id}/uninstall`)
    toast.remove()
    new Toast({text: `Successfully uninstalled mod ${mod.id}`})
    this.refreshData();
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}