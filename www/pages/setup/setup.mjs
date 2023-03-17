const elementName = 'system-setup-page'

import api from "/system/api.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import {on, off} from "/system/events.mjs"
import Toast from "/components/toast.mjs"
import { confirmDialog } from "/components/dialog.mjs"

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

    <h2>Core version</h2>
    <p>Current version: <span id="cur-version"></span></p>
    <p>Update available: <span id="update-available"></span></p>
    <button id="update-check" class="styled">Check for updates</button>
    <button id="update" class="styled">Update Core</button>
    <button id="restart-server-btn" class="styled">Restart server</button>

    <br><br><br>

    <h2>Microsoft sign-in support</h2>
    <p>Note: Changing these values requires a server restart.</p>
    <field-list labels-pct="20">
      <field-edit type="text" label="Client Id" id="msSigninClientId" title="Available from Azure app"></field-edit>
      <field-edit type="text" label="Secret" id="msSigninSecret"></field-edit>
      <field-edit type="text" label="Tenant (optional)" id="msSigninTenant" title="Everything after 'https://login.microsoftonline.com/'. Defaults to 'common'"></field-edit>
    </field-list>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    
    this.shadowRoot.getElementById("update-check").addEventListener("click", async () => {
      await api.post("system/update-check")
      this.refreshData();
    })
    this.shadowRoot.getElementById("update").addEventListener("click", async () => {
      let toast = new Toast({text: `Updating Core...`, showProgress: false})
      await api.post("system/update")
      toast.remove()
      new Toast({text: `Core has been updated. Please restart the server.`, showProgress: false, autoClose: false})
      this.refreshData();
    })
    this.shadowRoot.getElementById("restart-server-btn").addEventListener("click", () => restartServer())
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

window.customElements.define(elementName, Element);
export {Element, elementName as name}