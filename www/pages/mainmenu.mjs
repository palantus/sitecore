const elementName = 'main-menu'
import {userRoles, userPermissions, getUser, isSignedIn} from "/system/user.mjs";
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
        border-bottom: 1px solid #dddddd;
    }
    div.menu:first-child{
        border-top: 1px solid #dddddd;
    }

    div.item[style*="display: block"] + div.menu{
        border-top: 1px solid #dddddd;
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

    //this.shadowRoot.querySelector('h3').innerText = this.getAttribute('name');
    //this.shadowRoot.querySelector('img').src = this.getAttribute('avatar');
    
    this.shadowRoot.querySelector("#container").addEventListener("click", event => {
      let path;
      if(event.target.classList.contains("item")){
        path = event.target.getAttribute("data-path")
      } else if(event.target.parentElement.classList.contains("item")){
        path = event.target.parentElement.getAttribute("data-path")
      }

      if(path){
        goto(path, {forceRefresh: path == state().path})
      }

      if(event.target.classList.contains("menu")){
        this.toggleMenu(event.target)
      } else if(event.target.parentElement.classList.contains("menu")){
        this.toggleMenu(event.target.parentElement)
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

  toggleMenu(menu){
    let display = menu.classList.contains("open") ? "none" : "block";
    menu.classList.toggle("open")
    let mi = menu.nextSibling
    while(mi){
      if(mi.classList.contains("menu"))
        break;

      mi.style.display = display
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

      let sib = e.previousSibling;
      while(sib){
        if(sib.classList.contains("menu")) {
          sib.classList.add("open")
          break;
        }
        sib = sib.previousSibling;
      }
    })

    this.shadowRoot.querySelectorAll(".menu.open").forEach(m => {
      let item = m.nextSibling
      while(item){
        if(item.classList.contains("menu"))
          break;

        item.style.display = "block"
        item = item.nextSibling
      }
    })
  }

  addMenu(parent, items, parentMenuId){
    let anyAdded = false;
    let signedIn = isSignedIn();
    for(let item of items){
      if(item.role && !this.userRoles.includes(item.role) && !this.userRoles.includes("admin")) continue;
      if(item.permission && !this.userPermissions.includes(item.permission) && !this.userPermissions.includes("admin")) continue;
      if(item.public !== true && !signedIn) continue;
      if(item.hideWhenSignedIn && signedIn) continue;
      anyAdded = true;

      let itemDiv = document.createElement("div")
      let titleElement = document.createElement("span")
      itemDiv.appendChild(titleElement)

      if(!item.items){
        itemDiv.className = "item"
        titleElement.attributes.class = "itemtitle"
        titleElement.innerText = " - " + item.title

        itemDiv.setAttribute("data-path", item.path)
        itemDiv.setAttribute("data-menuid", parentMenuId)
      } else {
        itemDiv.className = "menu"
        titleElement.innerText = item.title
        
        let arrow = document.createElement("span")
        arrow.className = "menuarrow"
        arrow.innerText = " ▾"
        itemDiv.appendChild(arrow)
        itemDiv.setAttribute("data-menuid", this.nextMenuId++)
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
    //this.shadowRoot.querySelector('#toggle-info').addEventListener('click', () => this.toggleInfo());
  }

  disconnectedCallback() {
    off("logged-in", elementName)
    off("logged-out", elementName)
    //this.shadowRoot.querySelector('#toggle-info').removeEventListener();
  }
}

window.customElements.define(elementName, Page);

export {Page as Element, elementName as name}