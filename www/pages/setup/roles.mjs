const elementName = 'roles-page'

import api, {getUser} from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-ref.mjs"
import "/components/field.mjs"
import {showDialog} from "/components/dialog.mjs"
import {on, off} from "/system/events.mjs"

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
  </style>  

  <action-bar>
      <action-bar-item id="new-btn">New role</action-bar-item>
  </action-bar>

  <div id="container">
    <table>
        <thead>
            <tr>
              <th>Id</th>
              <th></th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>

    <dialog-component title="New role" id="newrole-dialog">
      <field-component label="Id"><input id="newrole-id"></input></field-component>
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

    this.newRole = this.newRole.bind(this); //Make sure "this" in that method refers to this
    this.refreshData = this.refreshData.bind(this); //Make sure "this" in that method refers to this
    this.buttonClicked = this.buttonClicked.bind(this); //Make sure "this" in that method refers to this
    
    this.shadowRoot.getElementById("new-btn").addEventListener("click", this.newRole)
    this.shadowRoot.getElementById("container").addEventListener("click", this.buttonClicked)

    this.refreshData();
  }

  async buttonClicked(evt){
    if(evt.target.classList.contains("deleterole")){
      let id = evt.target.getAttribute("data-id");
      await api.del("role/" + id)
      this.refreshData()
    }
  }

  async newRole(){
    let dialog = this.shadowRoot.querySelector("#newrole-dialog")

    showDialog(dialog, {
      show: async () => {
        this.shadowRoot.querySelector("#newrole-id").focus()
      },
      ok: async (val) => {
        await api.post("role", val)
        this.refreshData()
      },
      validate: (val) => 
          !val.id ? "Please fill out id"
        : true,
      values: () => {return {
        id: this.shadowRoot.getElementById("newrole-id").value,
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  async refreshData(){
    let roles = [];
    
    try{
      roles = await api.get("role")
    } catch(err){
      console.log(err)
      return;
    }

    let tab = this.shadowRoot.querySelector('table tbody')
    tab.innerHTML = "";

    for(let role of roles){
        let row = document.createElement("tr")
        row.classList.add("result")
        row.innerHTML = `
            <tr>
                <td><field-ref ref="/setup/role/${role.id}">${role.id}</field-ref></td>
                <td><button data-id="${role.id}" class="deleterole">Delete</button></td>
            </tr>
        `
        tab.appendChild(row);
    }
  }

  connectedCallback() {
    on("changed-page", elementName, this.refreshData)
  }

  pagerPageChange({detail:{page, start, end}}){
  }

  disconnectedCallback() {
    off("changed-page", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}