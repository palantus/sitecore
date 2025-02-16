const elementName = 'system-setup-page'

import api from "../../system/api.mjs"
import "../../components/field-edit.mjs"
import "../../components/field-list.mjs"
import "../../components/collapsible-card.mjs"
import {on, off} from "../../system/events.mjs"
import Toast from "../../components/toast.mjs"
import { confirmDialog } from "../../components/dialog.mjs"
import { stylesheets } from "../../system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
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
    collapsible-card > div{
      padding: 10px;
    }
    collapsible-card{
      margin-bottom: 15px;
      display: block;
    }
  </style>  

  <div id="container">

    <h1>System setup</h1>

    <collapsible-card open>
      <span slot="title">General</span>
      <div>
        <field-list labels-pct="20">
          <field-edit type="text" label="Site title" id="siteTitle"></field-edit>
          <field-edit type="text" label="Home - public" id="homePublic"></field-edit>
          <field-edit type="text" label="Home - signed in" id="homeInternal"></field-edit>
        </field-list>
      </div>
    </collapsible-card>

    <collapsible-card open>
      <span slot="title">Core version</span>
      <div>
        <p>Current version: <span id="cur-version"></span></p>
        <p>Update available: <span id="update-available"></span></p>
        <button id="update-check" class="styled">Check for updates</button>
        <button id="update" class="styled">Update Core</button>
        <button id="restart-server-btn" class="styled">Restart server</button>
        <button id="source-btn" class="styled">View source</button>
      </div>
    </collapsible-card>

    <collapsible-card>
      <span slot="title">Mod shop</span>
      <div>
        <p>Inserting an API key here will allow you to access otherwise private GitHub repositories that your GitHub account has access to.</p>
        <field-list labels-pct="20">
          <field-edit type="text" label="GitHub API Key" id="githubAPIKey"></field-edit>
          <field-edit type="date" label="Expiration date" id="githubAPIKeyExpiration" title="Only used as a reminder"></field-edit>
        </field-list>
      </div>
    </collapsible-card>

    <collapsible-card>
      <span slot="title">Microsoft sign-in support</span>
      <div>
        <p>Note: Changing these values requires a server restart.</p>
        <field-list labels-pct="20">
          <field-edit type="text" label="Client Id" id="msSigninClientId" title="Available from Azure app"></field-edit>
          <field-edit type="text" label="Secret" id="msSigninSecret"></field-edit>
          <field-edit type="text" label="Tenant (optional)" id="msSigninTenant" title="Everything after 'https://login.microsoftonline.com/'. Defaults to 'common'"></field-edit>
        </field-list>
      </div>
    </collapsible-card>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global];
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    
    this.shadowRoot.getElementById("update-check").addEventListener("click", async () => {
      let res = await api.post("system/update-check")
      if(res.updateAvailable) new Toast({text: "A new update is available"})
      else new Toast({text: "No new update is available"})
      this.refreshData();
    })
    this.shadowRoot.getElementById("update").addEventListener("click", async () => {
      if(!(await (confirmDialog("Are you sure that you want to update Core now? It will require a restart afterwards.", {title: "Update Core"})))) return;
      let toast = new Toast({text: `Updating Core...`, showProgress: false})
      await api.post("system/update")
      toast.remove()
      new Toast({text: `Core has been updated. Please restart the server.`, autoClose: 10000})
      this.refreshData();
    })
    this.shadowRoot.getElementById("restart-server-btn").addEventListener("click", () => restartServer())
    this.shadowRoot.getElementById("source-btn").addEventListener("click", () => window.open(`https://github.com/palantus/sitecore`))
  }

  async refreshData(){

    let setup = await api.get("system/setup")

    this.shadowRoot.getElementById('siteTitle').setAttribute("value", setup.siteTitle||"")
    this.shadowRoot.getElementById('homePublic').setAttribute("value", setup.homePublic||"")
    this.shadowRoot.getElementById('homeInternal').setAttribute("value", setup.homeInternal||"")

    this.shadowRoot.getElementById('msSigninClientId').setAttribute("value", setup.msSigninClientId||"")
    this.shadowRoot.getElementById('msSigninSecret').setAttribute("value", setup.msSigninSecretSet ? "*********" : "")
    this.shadowRoot.getElementById('msSigninTenant').setAttribute("value", setup.msSigninTenant||"")

    this.shadowRoot.getElementById('cur-version').innerText = setup.versionInstalled||"Unknown"
    this.shadowRoot.getElementById('update-available').innerHTML = (setup.versionInstalled != setup.versionAvailable) ? `<span style="color: green">Yes! (${setup.versionAvailable})</span>` : "No"

    this.shadowRoot.getElementById('githubAPIKey').setAttribute("value", setup.githubAPIKey||"")
    this.shadowRoot.getElementById('githubAPIKeyExpiration').setAttribute("value", setup.githubAPIKeyExpiration||"")

    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `system/setup`));
  }

  connectedCallback() {
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", elementName)
  }
}

export async function restartServer(){
  let activeUsers = await api.get("system/active-users")
  if(!(await (confirmDialog(`
    Restarting the server actually just stops it and it is expected that you have some kind of process manager (like pm2 or Podman) to start it again automatically. 
    Do you want to continue? 
    <br><br> 
    The following users are active on the site right now: 
    <ul>${activeUsers.map(u => `<li>${u.name} (${u.id})</li>`).sort().join("")}</ul>`
    , {title: "Restart server"})))) return;
  
  let toast = new Toast({text: "Successfully forced a system restart. Awaiting resurrection...", showProgress: false, autoClose: 50000})
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

window.customElements.define(elementName, Element);
export {Element, elementName as name}
