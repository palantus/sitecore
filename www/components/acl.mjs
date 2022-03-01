let elementName = "acl-component"

import {userPermissions} from "/system/user.mjs"
import api from "/system/api.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .dropdown:focus-within > .link,
    .link:hover {
      color: black;
    }
    
    .dropdown {
      position: relative;
      display: inline-block;
    }

    .dropdown-menu {
      position: absolute;
      left: 0;
      top: calc(100% + .25rem);
      padding: .75rem;
      border-radius: .25rem;
      box-shadow: 0 2px 5px 0 rgba(0, 0, 0, .5);
      background: var(--dark-back);
      opacity: 0;
      pointer-events: none;
      transform: translateY(-10px);
      transition: opacity 150ms ease-in-out, transform 150ms ease-in-out;
      color: white;
      min-width: 200px; 
      backdrop-filter: blur(5px);
    }

    .dropdown:focus-within{
      z-index: 2;
    }
    
    .dropdown:focus-within > span + .dropdown-menu {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
      cursor: initial;
    }

    #button{
      padding: 3px 4px 1px 4px;
      text-shadow: 1px 1px #000;
      background-color: black;
      font-family: "Lucida Console", "Courier New", monospace;
      font-size: 12px;
      cursor: pointer;
    }

    #button.public{color: #0f0;}
    #button.shared{color: #7676f7;}
    #button.inherit{color: #7676f7;}
    #button.role{color: #0ff;}
    #button.private{color: #f00;}
    #button.users{color: #d7a6ff}

    table td:not(:last-child){
      padding-right: 10px;
    }
    field-edit{
      min-width: 150px;
    }
    .hidden{display: none;}
  </style>
  <span class="dropdown" data-dropdown>
    <span tabindex=0 id="button"></span>
    <span class="dropdown-menu information-grid">

      <table>
        <tr class="owner">
          <td>Owner:</td>
          <td>
            <field-edit type="select" id="owner" lookup="user" disabled>
            </field-edit>
          </td>
        </tr>

        <tr class="read access">
          <td>Read</td>
          <td>
            <field-edit type="select" id="accessRead">
              <option value="public">Public</option>
              <option value="inherit" hidden>Inherit</option>
              <option value="shared">All users</option>
              <option value="users">Specific users</option>
              <option value="role">Members of Role</option>
              <option value="private">Private (only owner)</option>
            </field-edit>
          </td>
        </tr>
        <tr class="read role">
          <td></td>
          <td><field-edit id="roleRead" type="select" lookup="role"></field-edit></td>
        </tr>
        <tr class="read users">
          <td></td>
          <td><field-edit id="usersRead" type="text" lookup="user" placeholder="user1, user2, ..."></field-edit></td>
        </tr>

        <tr class="write access">
          <td>Write</td>
          <td>
            <field-edit type="select" id="accessWrite">
              <option value="shared">All users</option>
              <option value="inherit" hidden>Inherit</option>
              <option value="users">Specific users</option>
              <option value="role">Members of Role</option>
              <option value="private">Private (only owner)</option>
            </field-edit>
          </td>
        </tr>
        <tr class="write role">
          <td></td>
          <td><field-edit id="roleWrite" type="select" lookup="role"></field-edit></td>
        </tr>
        <tr class="write users">
          <td></td>
          <td><field-edit id="usersWrite" type="text" lookup="user" placeholder="user1, user2, ..."></field-edit></td>
        </tr>

        <tr class="execute access">
          <td>Execute</td>
          <td>
            <field-edit type="select" id="accessExecute">
              <option value="public">Public</option>
              <option value="inherit" hidden>Inherit</option>
              <option value="shared">All users</option>
              <option value="users">Specific users</option>
              <option value="role">Members of Role</option>
              <option value="private">Private (only owner)</option>
            </field-edit>
          </td>
        </tr>
        <tr class="execute role">
          <td></td>
          <td><field-edit id="roleExecute" type="select" lookup="role"></field-edit></td>
        </tr>
        <tr class="execute users">
          <td></td>
          <td><field-edit id="usersExecute" type="text" lookup="user" placeholder="user1, user2, ..."></field-edit></td>
        </tr>
      </table>

      <div id="buttons">
        <br>
        <button id="save">Save</button>
        <button id="reset">Reset</button>
        <button id="default">Set as default</button>
      </div>
    </span>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this)
    this.refreshView = this.refreshView.bind(this)
    this.setDefault = this.setDefault.bind(this)
    this.save = this.save.bind(this)

    this.shadowRoot.getElementById("save").addEventListener("click", this.save)
    this.shadowRoot.getElementById("reset").addEventListener("click", this.refreshData)
    this.shadowRoot.getElementById("default").addEventListener("click", this.setDefault)

    this.shadowRoot.getElementById("accessRead").addEventListener("value-changed", this.refreshView)
    this.shadowRoot.getElementById("accessWrite").addEventListener("value-changed", this.refreshView)
    this.shadowRoot.getElementById("accessExecute").addEventListener("value-changed", this.refreshView)

    this.refreshData()
  }

  refreshView(){
    let rights = this.getAttribute("rights") || "rw"

    if(rights.includes("r")){
      this.shadowRoot.querySelector("tr.read.access").classList.toggle("hidden", false)
      this.shadowRoot.querySelector("tr.read.role").classList.toggle("hidden", this.shadowRoot.getElementById("accessRead").getValue() != "role")
      this.shadowRoot.querySelector("tr.read.users").classList.toggle("hidden", this.shadowRoot.getElementById("accessRead").getValue() != "users")
    } else {
      this.shadowRoot.querySelectorAll("tr.read").forEach(tr => tr.classList.toggle("hidden", true))
    }  

    if(rights.includes("w")){
      this.shadowRoot.querySelector("tr.write.access").classList.toggle("hidden", false)
      this.shadowRoot.querySelector("tr.write.role").classList.toggle("hidden", this.shadowRoot.getElementById("accessWrite").getValue() != "role")
      this.shadowRoot.querySelector("tr.write.users").classList.toggle("hidden", this.shadowRoot.getElementById("accessWrite").getValue() != "users")
    } else {
      this.shadowRoot.querySelectorAll("tr.write").forEach(tr => tr.classList.toggle("hidden", true))
    }  

    if(rights.includes("x")){
      this.shadowRoot.querySelector("tr.execute.access").classList.toggle("hidden", false)
      this.shadowRoot.querySelector("tr.execute.role").classList.toggle("hidden", this.shadowRoot.getElementById("accessExecute").getValue() != "role")
      this.shadowRoot.querySelector("tr.execute.users").classList.toggle("hidden", this.shadowRoot.getElementById("accessExecute").getValue() != "users")
    } else {
      this.shadowRoot.querySelectorAll("tr.execute").forEach(tr => tr.classList.toggle("hidden", true))
    }  

    this.shadowRoot.getElementById("buttons").style.display = this.hasAttribute("disabledefault") ? "none" : "block"

    userPermissions().then(permissions => {
      this.shadowRoot.getElementById("owner").toggleAttribute("disabled", !permissions.includes("admin"))
    })
  }

  async refreshData(){
    if(!this.typeId) return;
    if(!this.entityId) return;
    if(this.hasAttribute("disabled")) return;

    let rights = await api.get(`acl/${this.typeId}/${this.entityId}`)

    this.shadowRoot.getElementById("owner").setAttribute("value", rights.owner)

    this.shadowRoot.getElementById("accessRead").setAttribute("value", rights.read?.access||"")
    this.shadowRoot.getElementById("accessWrite").setAttribute("value", rights.write?.access||"")
    this.shadowRoot.getElementById("accessExecute").setAttribute("value", rights.execute?.access||"")

    this.shadowRoot.getElementById("roleRead").setAttribute("value", rights.read?.role||"")
    this.shadowRoot.getElementById("roleWrite").setAttribute("value", rights.write?.role||"")
    this.shadowRoot.getElementById("roleExecute").setAttribute("value", rights.execute?.role||"")

    this.shadowRoot.getElementById("usersRead").setAttribute("value", rights.read?.users||"")
    this.shadowRoot.getElementById("usersWrite").setAttribute("value", rights.write?.users||"")
    this.shadowRoot.getElementById("usersExecute").setAttribute("value", rights.execute?.users||"")

    this.shadowRoot.getElementById("button").className = "";
    this.shadowRoot.getElementById("button").classList.add(rights.read?.access||"private");
    this.shadowRoot.getElementById("button").innerText = rights.read?.access == "role" ? `role:${rights.read?.role||"N/A"}` 
                                                      : rights.read?.access == "users" ? `users:${(rights.read?.users||[]).join(",")}` 
                                                      : (rights.read?.access||"private")

    this.shadowRoot.getElementById("accessRead").shadowRoot.querySelector("option[value=inherit]").toggleAttribute("hidden", !rights.supportInheritance)
    this.shadowRoot.getElementById("accessWrite").shadowRoot.querySelector("option[value=inherit]").toggleAttribute("hidden", !rights.supportInheritance)
    this.shadowRoot.getElementById("accessExecute").shadowRoot.querySelector("option[value=inherit]").toggleAttribute("hidden", !rights.supportInheritance)

    this.refreshView()

    this.shadowRoot.getElementById("owner").setAttribute("patch", `acl/${this.typeId}/${this.entityId}`);
    
  }

  getAcl(){
    let conv = (a, r, u) => a == "role" ? `${a}:${r}` 
                       : a == "users" ? `${a}:${u.split(",").map(u => u.trim()).join(",")}` 
                       : a 
    let readAccess = this.shadowRoot.getElementById("accessRead").getValue()
    let writeAccess = this.shadowRoot.getElementById("accessWrite").getValue()
    let execAccess = this.shadowRoot.getElementById("accessExecute").getValue()

    let readRole = this.shadowRoot.getElementById("roleRead").getValue()
    let writeRole = this.shadowRoot.getElementById("roleWrite").getValue()
    let execRole = this.shadowRoot.getElementById("roleExecute").getValue()

    let readUsers = this.shadowRoot.getElementById("usersRead").getValue()
    let writeUsers = this.shadowRoot.getElementById("usersWrite").getValue()
    let execUsers = this.shadowRoot.getElementById("usersExecute").getValue()

    return `r:${conv(readAccess, readRole, readUsers)};w:${conv(writeAccess, writeRole, writeUsers)};x:${conv(execAccess, execRole, execUsers)}`
  }

  async save(){
    if(!this.typeId) return;
    if(!this.entityId) return;
    await api.patch(`acl/${this.typeId}/${this.entityId}`, {acl: this.getAcl()})
    this.refreshData()
  }

  async setDefault(){
    await api.patch(`acl/${this.typeId}/default`, {acl: this.getAcl()})
  }

  static get observedAttributes() {
    return ["rights", "type", "entity-id", "disabled"];
  }  

  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "rights":
        if(newValue != oldValue) {
          this.refreshView()
        }
        break;
      case "type":
        this.typeId = newValue
        this.refreshData()
        break;
      case "entity-id":
        this.entityId = newValue
        this.refreshData()
        break;
      case "disabled":
        this.refreshData()
        break;
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}