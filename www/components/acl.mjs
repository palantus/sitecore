let elementName = "acl-component"

import {userPermissions} from "../system/user.mjs"
import api from "../system/api.mjs"
import "../components/dropdown-menu.mjs"
import { siteURL } from "../system/core.mjs";

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #button{
      padding: 3px 4px 1px 4px;
      text-shadow: 1px 1px #000;
      background-color: black;
      font-family: "Lucida Console", "Courier New", monospace;
      font-size: 12px;
      cursor: pointer;
      user-select: none;
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
    table td{vertical-align: top;}
    
    .hidden{display: none;}
    div.share{
      display: flex;
    }
    dropdown-menu-component:not([always-show]) div.share{
      min-width: 300px;
    }
    div.share field-edit[field=name]{
      margin-right: 10px;
    }
    dropdown-menu-component[always-show] #button{
      margin-bottom: 5px;
      display: inline-block;
    }
  </style>
  <dropdown-menu-component width="200px">
    <span slot="button">
      <span tabindex=0 id="button"></span>
    </span>
    <span slot="content">
      <table>
        <tr class="owner">
          <td>Owner:</td>
          <td>
            <field-edit type="text" id="owner" lookup="user" disabled>
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
              <option value="permission">User permission</option>
              <option value="private">Private (only owner)</option>
            </field-edit>
          </td>
        </tr>
        <tr class="read role">
          <td></td>
          <td><field-edit id="roleRead" type="select" lookup="role"></field-edit></td>
        </tr>
        <tr class="read permission">
          <td></td>
          <td><field-edit id="permissionRead" type="select" lookup="permission"></field-edit></td>
        </tr>
        <tr class="read users">
          <td></td>
          <td><field-edit id="usersRead" type="text" lookup="user" placeholder="user1, user2, ..."></field-edit></td>
        </tr>

        <tr class="write access">
          <td>Write:</td>
          <td>
            <field-edit type="select" id="accessWrite">
              <option value="public">Public</option>
              <option value="inherit" hidden>Inherit</option>
              <option value="shared">All users</option>
              <option value="users">Specific users</option>
              <option value="role">Members of Role</option>
              <option value="permission">User permission</option>
              <option value="private">Private (only owner)</option>
            </field-edit>
          </td>
        </tr>
        <tr class="write role">
          <td></td>
          <td><field-edit id="roleWrite" type="select" lookup="role"></field-edit></td>
        </tr>
        <tr class="write permission">
          <td></td>
          <td><field-edit id="permissionWrite" type="select" lookup="permission"></field-edit></td>
        </tr>
        <tr class="write users">
          <td></td>
          <td><field-edit id="usersWrite" type="text" lookup="user" placeholder="user1, user2, ..."></field-edit></td>
        </tr>

        <tr class="execute access">
          <td>Execute:</td>
          <td>
            <field-edit type="select" id="accessExecute">
              <option value="public">Public</option>
              <option value="inherit" hidden>Inherit</option>
              <option value="shared">All users</option>
              <option value="users">Specific users</option>
              <option value="role">Members of Role</option>
              <option value="permission">User permission</option>
              <option value="private">Private (only owner)</option>
            </field-edit>
          </td>
        </tr>
        <tr class="execute role">
          <td></td>
          <td><field-edit id="roleExecute" type="select" lookup="role"></field-edit></td>
        </tr>
        <tr class="execute permission">
          <td></td>
          <td><field-edit id="permissionExecute" type="select" lookup="permission"></field-edit></td>
        </tr>
        <tr class="execute users">
          <td></td>
          <td><field-edit id="usersExecute" type="text" lookup="user" placeholder="user1, user2, ..."></field-edit></td>
        </tr>

        <tr>
          <td>Shares:</td>
          <td>
            <table>
              <tbody id="shares">
              </tbody>
            </table>
            <button id="add-share" title="Add share">Add</button>
          </td>
        </tr>
      </table>

      <div id="buttons">
        <br>
        <button id="save">Save</button>
        <button id="reset">Reset</button>
        <button id="default">Set as default</button>
      </div>
    </span>
  </dropdown-menu-component>
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
    this.shareClick = this.shareClick.bind(this)

    this.shadowRoot.getElementById("save").addEventListener("click", this.save)
    this.shadowRoot.getElementById("reset").addEventListener("click", this.refreshData)
    this.shadowRoot.getElementById("default").addEventListener("click", this.setDefault)
    this.shadowRoot.getElementById("add-share").addEventListener("click", () => api.post(`acl/${this.typeId}/${this.entityId}/share`).then(this.refreshData))
    this.shadowRoot.getElementById("shares").addEventListener("click", this.shareClick)

    this.shadowRoot.getElementById("accessRead").addEventListener("value-changed", this.refreshView)
    this.shadowRoot.getElementById("accessWrite").addEventListener("value-changed", this.refreshView)
    this.shadowRoot.getElementById("accessExecute").addEventListener("value-changed", this.refreshView)

    if(this.hasAttribute("always-show")){
      this.shadowRoot.querySelector("dropdown-menu-component").setAttribute("always-show", '')
    }

    this.refreshData()
  }

  refreshView(){
    let rights = this.getAttribute("rights") || "rw"

    if(rights.includes("r")){
      this.shadowRoot.querySelector("tr.read.access").classList.toggle("hidden", false)
      this.shadowRoot.querySelectorAll("field-edit.read").forEach(e => e.classList.toggle("hidden", false))
      this.shadowRoot.querySelector("tr.read.role").classList.toggle("hidden", this.shadowRoot.getElementById("accessRead").getValue() != "role")
      this.shadowRoot.querySelector("tr.read.permission").classList.toggle("hidden", this.shadowRoot.getElementById("accessRead").getValue() != "permission")
      this.shadowRoot.querySelector("tr.read.users").classList.toggle("hidden", this.shadowRoot.getElementById("accessRead").getValue() != "users")
    } else {
      this.shadowRoot.querySelectorAll("tr.read,field-edit.read").forEach(tr => tr.classList.toggle("hidden", true))
    }  

    if(rights.includes("w")){
      this.shadowRoot.querySelector("tr.write.access").classList.toggle("hidden", false)
      this.shadowRoot.querySelectorAll("field-edit.write").forEach(e => e.classList.toggle("hidden", false))
      this.shadowRoot.querySelector("tr.write.role").classList.toggle("hidden", this.shadowRoot.getElementById("accessWrite").getValue() != "role")
      this.shadowRoot.querySelector("tr.write.permission").classList.toggle("hidden", this.shadowRoot.getElementById("accessWrite").getValue() != "permission")
      this.shadowRoot.querySelector("tr.write.users").classList.toggle("hidden", this.shadowRoot.getElementById("accessWrite").getValue() != "users")
    } else {
      this.shadowRoot.querySelectorAll("tr.write,field-edit.write").forEach(tr => tr.classList.toggle("hidden", true))
    }  

    if(rights.includes("x")){
      this.shadowRoot.querySelector("tr.execute.access").classList.toggle("hidden", false)
      this.shadowRoot.querySelectorAll("field-edit.execute").forEach(e => e.classList.toggle("hidden", false))
      this.shadowRoot.querySelector("tr.execute.role").classList.toggle("hidden", this.shadowRoot.getElementById("accessExecute").getValue() != "role")
      this.shadowRoot.querySelector("tr.execute.permission").classList.toggle("hidden", this.shadowRoot.getElementById("accessExecute").getValue() != "permission")
      this.shadowRoot.querySelector("tr.execute.users").classList.toggle("hidden", this.shadowRoot.getElementById("accessExecute").getValue() != "users")
    } else {
      this.shadowRoot.querySelectorAll("tr.execute,field-edit.execute").forEach(tr => tr.classList.toggle("hidden", true))
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

    let acl = await api.get(`acl/${this.typeId}/${this.entityId}`)

    this.shadowRoot.getElementById("owner").setAttribute("value", acl.owner)

    this.shadowRoot.getElementById("accessRead").setAttribute("value", acl.read?.access||"")
    this.shadowRoot.getElementById("accessWrite").setAttribute("value", acl.write?.access||"")
    this.shadowRoot.getElementById("accessExecute").setAttribute("value", acl.execute?.access||"")

    this.shadowRoot.getElementById("roleRead").setAttribute("value", acl.read?.role||"")
    this.shadowRoot.getElementById("roleWrite").setAttribute("value", acl.write?.role||"")
    this.shadowRoot.getElementById("roleExecute").setAttribute("value", acl.execute?.role||"")

    this.shadowRoot.getElementById("permissionRead").setAttribute("value", acl.read?.permission||"")
    this.shadowRoot.getElementById("permissionWrite").setAttribute("value", acl.write?.permission||"")
    this.shadowRoot.getElementById("permissionExecute").setAttribute("value", acl.execute?.permission||"")

    this.shadowRoot.getElementById("usersRead").setAttribute("value", acl.read?.users||"")
    this.shadowRoot.getElementById("usersWrite").setAttribute("value", acl.write?.users||"")
    this.shadowRoot.getElementById("usersExecute").setAttribute("value", acl.execute?.users||"")

    this.shadowRoot.getElementById("button").className = "";
    this.shadowRoot.getElementById("button").classList.add(acl.read?.access||"private");
    this.shadowRoot.getElementById("button").innerText = acl.read?.access == "role" ? `role:${acl.read?.role||"N/A"}` 
                                                       : acl.read?.access == "permission" ? `perm:${acl.read?.permission||"N/A"}` 
                                                       : acl.read?.access == "users" ? `users:${(acl.read?.users||[]).join(",")}` 
                                                      : (acl.read?.access||"private")

    this.shadowRoot.getElementById("accessRead").shadowRoot.querySelector("option[value=inherit]").toggleAttribute("hidden", !acl.supportInheritance)
    this.shadowRoot.getElementById("accessWrite").shadowRoot.querySelector("option[value=inherit]").toggleAttribute("hidden", !acl.supportInheritance)
    this.shadowRoot.getElementById("accessExecute").shadowRoot.querySelector("option[value=inherit]").toggleAttribute("hidden", !acl.supportInheritance)

    this.shadowRoot.getElementById("shares").innerHTML = acl.shares.map(s => `
      <div class="share">
          <field-edit type="text" field="name" value="${s.name}" patch="acl/${this.typeId}/${this.entityId}/share/${s.id}"></field-edit>
          <field-edit class="read" type="checkbox" field="read" title="Read access" value="${s.rights.read}" patch="acl/${this.typeId}/${this.entityId}/share/${s.id}"></field-edit>
          <field-edit class="write" type="checkbox" field="write" title="Write access" value="${s.rights.write}" patch="acl/${this.typeId}/${this.entityId}/share/${s.id}"></field-edit>
          <field-edit class="execute" type="checkbox" field="execute" title="Execute access" value="${s.rights.execute}" patch="acl/${this.typeId}/${this.entityId}/share/${s.id}"></field-edit>
          <button class="copy" data-key="${s.key}"}>Copy</button>
          <button class="delete" data-id="${s.id}">Delete</button>
      </div>`).join("")

    if(!acl.canEdit){
      this.shadowRoot.querySelectorAll("field-edit").forEach(e => e.toggleAttribute("disabled", true))
      this.shadowRoot.querySelectorAll("button").forEach(e => e.classList.toggle("hidden", true))
    }

    let rights = this.getAttribute("rights") || "rw"
    this.shadowRoot.getElementById("button").setAttribute("title", (acl.read && rights.includes("r") ? `Read: ${acl.read.access} ${(acl.read?.users?.join(",")||"")+(acl.read?.role||"")+(acl.read?.permission||"")}\n` : '')
                                                                   + (acl.write && rights.includes("w") ? `Write: ${acl.write.access} ${(acl.write?.users?.join(",")||"")+(acl.write?.role||"")+(acl.write?.permission||"")}\n` : '')
                                                                   + (acl.execute && rights.includes("x") ? `Execute: ${acl.execute.access} ${(acl.execute?.users?.join(",")||"")+(acl.execute?.role||"")+(acl.execute?.permission||"")}\n` : '')
                                                                   + `Shares: ${acl.shares.length}`)

    this.refreshView()

    this.shadowRoot.getElementById("owner").setAttribute("patch", `acl/${this.typeId}/${this.entityId}`);
    
  }

  getAcl(){
    let conv = (a, r, u, p) => a == "role" ? `${a}:${r}` 
                             : a == "permission" ? `${a}:${p}` 
                             : a == "users" ? `${a}:${u.split(",").map(u => u.trim()).join(",")}` 
                             : a 
    let readAccess = this.shadowRoot.getElementById("accessRead").getValue()
    let writeAccess = this.shadowRoot.getElementById("accessWrite").getValue()
    let execAccess = this.shadowRoot.getElementById("accessExecute").getValue()

    let readRole = this.shadowRoot.getElementById("roleRead").getValue()
    let writeRole = this.shadowRoot.getElementById("roleWrite").getValue()
    let execRole = this.shadowRoot.getElementById("roleExecute").getValue()

    let readPermission = this.shadowRoot.getElementById("permissionRead").getValue()
    let writePermission = this.shadowRoot.getElementById("permissionWrite").getValue()
    let execPermission = this.shadowRoot.getElementById("permissionExecute").getValue()

    let readUsers = this.shadowRoot.getElementById("usersRead").getValue()
    let writeUsers = this.shadowRoot.getElementById("usersWrite").getValue()
    let execUsers = this.shadowRoot.getElementById("usersExecute").getValue()

    return `r:${conv(readAccess, readRole, readUsers, readPermission)};w:${conv(writeAccess, writeRole, writeUsers, writePermission)};x:${conv(execAccess, execRole, execUsers, execPermission)}`
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

  async shareClick(e){
    if(e.target.classList.contains("delete")){
      let id = e.target.getAttribute("data-id")
      if(!id) return;
      api.del(`acl/${this.typeId}/${this.entityId}/share/${id}`).then(this.refreshData)
    } else if(e.target.classList.contains("copy")){
      let key = e.target.getAttribute("data-key");
      let type = await api.get(`system/datatypes/${this.typeId}`);
      let url = `${siteURL()}/${type.ui.path}/${this.entityId}?shareKey=${key}`;
      navigator.clipboard.writeText(url)
    }
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
