const elementName = 'apikeys-page'

import api from "/system/api.mjs"
import {getUser} from "/system/user.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-ref.mjs"
import "/components/field.mjs"
import {showDialog, promptDialog} from "/components/dialog.mjs"
import {on, off, fire} from "/system/events.mjs"
import {uuidv4} from "/libs/uuid.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style>
    #container{
        padding: 10px;
        /*padding-top: 55px;*/
        position: relative;
    }
    table{
      width: 100%;
      margin-top: 5px;
      box-shadow: 0px 0px 10px gray;
      border: 1px solid gray;
    }
    table thead tr{
      border: 1px solid gray;
    }

    table thead th:nth-child(1){width: 100px}
    table thead th:nth-child(2){width: 200px}
    table thead th:nth-child(3){width: 200px}
    table thead th:nth-child(4){width: 200px}
    table thead th:nth-child(5){width: 100px}
  </style>  

  <action-bar>
      <action-bar-item id="new-btn">New key</action-bar-item>
  </action-bar>

  <div id="container">
    <table>
        <thead>
            <tr>
              <th>Id</th>
              <th>Name</th>
              <th>User</th>
              <th>Issued</th>
              <th>Daily</th>
              <th></th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>

    <dialog-component title="New API Key" id="newkey-dialog">
      <field-component label="Name"><input id="newkey-name"></input></field-component>
      <field-component label="User"><input id="newkey-user" list="users"></input></field-component>
      <field-component label="Key"><input id="newkey-key"></input></field-component>
      <p>Remember to copy the key above, as it will not be shown/available again!</p>
      <field-component label="Daily key"><input type="checkbox" id="newkey-daily"></input></field-component>
      <p>If you set this as a daily key, then the actual key that you use for API access must be a SHA256 hash of a string concatenation of the above key and the current date (YYYY-MM-DD) - i.e. sha256(key+today). This is useful, because you can generate links that will only work for one day (eg. with ?token=key).</p>
    </dialog-component>

    <datalist id="users">
    </datalist>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.newKey = this.newKey.bind(this); //Make sure "this" in that method refers to this
    this.refreshData = this.refreshData.bind(this); //Make sure "this" in that method refers to this
    this.buttonClicked = this.buttonClicked.bind(this); //Make sure "this" in that method refers to this
    
    this.shadowRoot.getElementById("new-btn").addEventListener("click", this.newKey)
    this.shadowRoot.getElementById("container").addEventListener("click", this.buttonClicked)

    this.refreshData();
  }

  async buttonClicked(evt){
    if(evt.target.classList.contains("deletekey")){
      let id = evt.target.getAttribute("data-id");
      await api.del("system/apikeys/" + id)
      this.refreshData()
    } else if(evt.target.classList.contains("getDaily")){
      let id = evt.target.getAttribute("data-id");
      promptDialog("Daily key, valid for today:", (await api.get(`system/apikeys/${id}/daily`)).key)
    }
  }

  async newKey(){
    let dialog = this.shadowRoot.querySelector("#newkey-dialog")

    showDialog(dialog, {
      show: async () => {
        this.shadowRoot.querySelector("#newkey-name").focus()
        this.shadowRoot.querySelector("#newkey-key").value = uuidv4()
        this.shadowRoot.querySelector("#newkey-user").value = (await getUser()).id
      },
      ok: async (val) => {
        await api.post("system/apikeys", val)
        this.refreshData()
      },
      validate: (val) => 
          !val.name ? "Please fill out name"
        : !val.key ? "Please fill out key"
        : !val.userId ? "Please fill out user"
        : true,
      values: () => {return {
        name: this.shadowRoot.getElementById("newkey-name").value,
        key: this.shadowRoot.getElementById("newkey-key").value,
        userId: this.shadowRoot.getElementById("newkey-user").value,
        daily: this.shadowRoot.getElementById("newkey-daily").checked
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  async refreshData(){
    let keys = [];
    
    try{
      keys = await api.get("system/apikeys")
    } catch(err){
      console.log(err)
      return;
    }

    let tab = this.shadowRoot.querySelector('table tbody')
    tab.innerHTML = "";

    for(let key of keys){
        let row = document.createElement("tr")
        row.classList.add("result")
        row.innerHTML = `
            <tr>
                <td>${key.id}</td>
                <td>${key.name}</td>
                <td>${key.userId}</td>
                <td>${key.issueDate?.substring(0, 19).replace("T", " ") ||"N/A"}</td>
                <td>${key.daily ? "Yes" : "No"}</td>
                <td>
                  <button data-id="${key.id}" class="deletekey">Delete</button>
                  ${key.daily ? `<button data-id="${key.id}" class="getDaily">Generate daily key</button>` : ""}
                </td>
            </tr>
        `
        tab.appendChild(row);
    }
  }

  connectedCallback() {
    api.get("user").then((users) => {
      this.shadowRoot.getElementById("users").innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join("");
    })

    on("changed-project", "apikeys", this.refreshData)
    on("changed-page", "apikeys", this.refreshData)
  }

  pagerPageChange({detail:{page, start, end}}){
  }

  disconnectedCallback() {
    off("changed-project", "apikeys")
    off("changed-page", "apikeys")
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}