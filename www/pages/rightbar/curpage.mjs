const elementName = 'rightbar-curpage-component'

import api from "/system/api.mjs"
import "/pages/rightbar/rightcard.mjs"
import {on, off, fire} from "/system/events.mjs"
import {state, goto} from "/system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{color: white; padding: 10px;}
    h2{margin: 0px; margin-bottom: 10px; border-bottom: 1px solid lightgray; padding-bottom: 5px;}
    h2{margin: 0px; margin-bottom: 10px; padding-bottom: 5px;}
    span{color: var(--accent-color-light);}
    #wiki a{color: lightblue;}
  </style>
  <div id="container">
      <h2>Current page</h2>

      <div id="page-id"></div>
      <br>
      <label for="addtolist">Add to list: </label><select id="addtolist"></select>

      <br><br>
      <button id="edit-wiki">Edit notes in Wiki</button>
      <div id="wiki"></div>
      
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.addToList = this.addToList.bind(this)
    this.jumpToWiki = this.jumpToWiki.bind(this)
    this.refreshData = this.refreshData.bind(this)
    this.wikiClick = this.wikiClick.bind(this)

    this.shadowRoot.getElementById("addtolist").addEventListener("change", this.addToList)
    this.shadowRoot.getElementById("edit-wiki").addEventListener("click", this.jumpToWiki)
    this.shadowRoot.getElementById("wiki").addEventListener("click", this.wikiClick)

    this.addEventListener("opened", this.refreshData)
  }

  async jumpToWiki(){
    goto(`/wiki/${this.wikiId}`)
  }

  async addLists(){
    let lists = await api.get("lists")
    lists = lists.sort((a, b) => a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1)
    this.shadowRoot.getElementById("addtolist").innerHTML = "<option value=\"\"></option>"
                                                          + lists.map(list => `<option value="${list.id}">${list.title}</option>`).join("")
  }

  async addToList(){
    let listId = this.shadowRoot.getElementById("addtolist").value
    if(!listId) return;
    this.shadowRoot.getElementById("addtolist").value = ""

    let path = state().path
    let link = path.length < 1 ? "/dashboard"
             : state().query.filter ? `${path}?filter=${state().query.filter}`
             : path

    await api.post(`lists/${listId}/items`, {text: `[[${link}]]`})
    fire("log", {level: "info", message: "Page added to list"})
  }

  async refreshData(){
    this.shadowRoot.getElementById("page-id").innerText = state().path;
    this.addLists();

    api.post("wiki/generate-id", {id: state().path.slice(1) || "dashboard"})
       .then(id => {
         this.wikiId = id
         this.refreshWiki()
       })
  }

  async refreshWiki(){
    let wiki = await api.get(`wiki/${this.wikiId}`)
    this.shadowRoot.getElementById("wiki").innerHTML = wiki.html || ""
  }

  wikiClick(e){
    if(e.target.tagName == "A"){
      let href = e.target.getAttribute("href")
      if(href.startsWith("/")){
        e.preventDefault();
        goto(href)
      }
    }
  }

  connectedCallback() {
    on("changed-project", elementName, this.refreshData)
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-project", elementName)
    off("changed-page", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}