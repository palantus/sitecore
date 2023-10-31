const elementName = 'main-menu'
import {userRoles, userPermissions, getUser, isSignedIn} from "../system/user.mjs";
import {goto, state, isMobile, menu, ready} from "../system/core.mjs"
import {on} from "../system/events.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{
      line-height: 1.5;
    }

    div.menu{
        color: white;
        padding: 5px;
        padding-top: 10px;
        padding-bottom: 10px;
        transition: background 0.2s linear;
        user-select: none;
        position: relative;
        cursor: pointer;
    }

    div.menu{
        border-bottom: 1px solid var(--contrast-color-muted);
    }
    div.menu:first-child{
        border-top: 1px solid var(--contrast-color-muted);
    }

    div.item[style*="display: block"] + div.menu{
        border-top: 1px solid var(--contrast-color-muted);
    }

    div.menu:hover,div.item:hover{
        background-color: var(--dark-hover-back);
        cursor: pointer;
    }

    div.menu.selected{
        background-color: var(--accent-color-transparent) !important;
    }

    div.item{
        padding-top: 3px;
        padding-bottom: 3px;
    }

    div.inaccessible{
      display: none !important;
    }
    div.inaccessible div.item{
      display: none !important;
    }

    .menuarrow{
        display: inline-block;
        margin-left: 10px; 
        color: #aaa; 
        content: ' ▾'; 
        transition: all 0.2s linear;
        transform:rotate(-90deg); 
        position:absolute; right:15px;
    }
    div.menu.open .menuarrow{
        transform:rotate(0deg);
    }

    span.itemtitle {
        padding: 0 0 0 0.5em;
        background: 0 0.1em no-repeat;
        background-size: 1em 1em;
    }

    /* Items */
    div.item{
            
        color: white;
        padding: 5px;
        padding-top: 3px;
        padding-bottom: 3px;
        
        /*transition: background 0.2s linear;*/
        user-select: none;
        position: relative;
        cursor: pointer;
    }

    div.item:hover{
        background-color: var(--dark-hover-back);
        cursor: pointer;
    }

    div.item.selected{
        background: var(--accent-back);
    }

    div.item span {
        padding: 0 0 0 0;
        background: 0 0.1em no-repeat;
        background-size: 1em 1em;
    }
    span.levelindicator{
      border-left: 4px solid var(--accent-back);
      margin-left: 1px;
    }
    div.menu span.title:not(:first-child){
      padding-left: 5px;
    }
  </style>

  <div id="container">
  </div>
`;

class Page extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.toggleDisplay = this.toggleDisplay.bind(this)
    this.updateSelected = this.updateSelected.bind(this)
    this.refreshData = this.refreshData.bind(this)

    this.refreshData();

    this.shadowRoot.querySelector("#container").addEventListener("click", event => {
      let item = event.target.closest(".item")
      if(item) {
        let path = item.getAttribute("data-path")
        if(path){
          if(path.startsWith("/_")) 
            window.open(path)
          else
            goto(path, {forceRefresh: path == state().path})
        }
      } else {
        let menu = event.target.closest(".menu")
        if(menu){
          this.toggleMenu(menu)
        }
      }
    })

    on("changed-page", "mainmenu", this.updateSelected)
    on("toggle-menu", "mainmenu", this.toggleDisplay)
  }

  toggleDisplay(){
    let doShow = document.getElementById("grid-container").classList.contains("collapsed")
    document.getElementById("grid-container").classList.toggle("collapsed", !doShow)
    if(doShow && isMobile()){
      document.getElementById("grid-container").classList.remove("rightvisible");
    }
  }

  toggleMenu(menu, force){
    let doShow = force !== undefined ? force : !menu.classList.contains("open");
    let display = doShow ? "block" : "none";
    menu.classList.toggle("open", doShow)
    let mi = menu.nextSibling
    while(mi){
      if(mi.classList.contains("menu")){
        if(mi.dataset.parentmenuid == menu.dataset.menuid){
          mi.style.display = display
          if(!doShow){
            this.toggleMenu(mi, false)
          }
        }
      } else if(mi.dataset.menuid == menu.dataset.menuid){
        mi.style.display = display
      }

      mi = mi.nextSibling
    }
  }

  async refreshData(){
    await ready;
    if(isSignedIn()){
      this.user = await getUser()
      this.userRoles = await userRoles()
      this.userPermissions = await userPermissions()
    } else {
      this.user = null;
      this.userRoles = []
      this.userPermissions = []
    }
    this.refreshMenu();
  }

  updateSelected(){
    this.shadowRoot.querySelectorAll(".selected").forEach(e => e.classList.remove("selected"))
    this.shadowRoot.querySelectorAll(".menu").forEach(e => e.classList.remove("open"))
    this.shadowRoot.querySelectorAll(".item").forEach(e => e.style.display = "none")

    this.shadowRoot.querySelectorAll(`.item[data-path="${state().path}"]`).forEach(e => {
      e.classList.add("selected")
      let parentMenu = this.shadowRoot.querySelector(`.menu[data-menuid="${e.dataset.menuid}"]`);
      let menus = []
      while(parentMenu){
        menus.push(parentMenu)
        parentMenu = this.shadowRoot.querySelector(`.menu[data-menuid="${parentMenu.dataset.parentmenuid}"]`);
      }
      menus.reverse().forEach(m => this.toggleMenu(m, true))
    })
  }

  addMenu(parent, items, parentMenuId){
    let anyAdded = false;
    let signedIn = isSignedIn();
    for(let item of items){
      if(!item.items){
        if(item.role && !this.userRoles.includes(item.role)) continue;
        if(item.permission && !this.userPermissions.includes(item.permission)) continue;
        if(item.public !== true && !signedIn) continue;
        if(item.hideWhenSignedIn && signedIn) continue;
      }
      anyAdded = true;

      let itemDiv = document.createElement("div")
      let titleElement = document.createElement("span")
      itemDiv.appendChild(titleElement)

      if(!item.items){
        itemDiv.className = "item"
        titleElement.attributes.class = "itemtitle"
        titleElement.innerText = " - " + item.title

        itemDiv.setAttribute("data-path", item.target||item.path)
        itemDiv.setAttribute("data-menuid", parentMenuId)
      } else {
        let level = parentMenuId ? parseInt(this.shadowRoot.querySelector(`.menu[data-menuid="${parentMenuId}"]`).dataset.level)+1
                                 : 0;
        itemDiv.dataset.level = level;
        itemDiv.style.display = parentMenuId ? "none" : "block";

        itemDiv.className = "menu"
        titleElement.innerHTML = `${level > 0 ? `${'<span class="levelindicator"></span>'.repeat(level)} `:''}<span class="title">${item.title}</span>`
        
        let arrow = document.createElement("span")
        arrow.className = "menuarrow"
        arrow.innerText = " ▾"
        itemDiv.appendChild(arrow)
        itemDiv.setAttribute("data-menuid", this.nextMenuId++)
        itemDiv.setAttribute("data-parentmenuid", parentMenuId)
      }

      parent.appendChild(itemDiv)

      if(item.items){
        if(!this.addMenu(parent, item.items, itemDiv.getAttribute("data-menuid"))){
          itemDiv.remove(); //No child items added
        }
      }
    }
    return anyAdded;
  }

  refreshMenu(){
    let container = this.shadowRoot.querySelector("#container")
    container.innerHTML = ""
    this.nextMenuId = 1;
    this.addMenu(container, menu())
    this.updateSelected();
  }

  connectedCallback() {
    on("logged-in", elementName, this.refreshData)
    on("logged-out", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("logged-in", elementName)
    off("logged-out", elementName)
  }
}

window.customElements.define(elementName, Page);

export {Page as Element, elementName as name}