let elementName = "table-paging"

import { stylesheets } from "../system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container {
        text-align: right;
    }
    input{
      width: 40px;
      text-align: center;
    }
    button{
      width: 45px;
    }
  </style>
  <div id="container">
    <button id="first" class="styled">First</button>
    <button id="prev" class="styled">Prev</button>
    <input type="number" id="page" value="1"/>
    <button id="next" class="styled">Next</button>
    <button id="last" class="styled">Last</button>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global]
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    //this.shadowRoot.querySelector('h3').innerText = this.getAttribute('name');
    //this.shadowRoot.querySelector('img').src = this.getAttribute('avatar');

    this.next = this.next.bind(this);
    this.prev = this.prev.bind(this);
    this.last = this.last.bind(this);
    this.first = this.first.bind(this);
    this.pageInputChanged = this.pageInputChanged.bind(this);    
  }

  static get observedAttributes() {
    return ["maxPerPage", "page", "total"];
  }  

  get page() {
    return parseInt(this.getAttribute("page"))
  }
  get total() {
    return parseInt(this.getAttribute("total"))
  }
  get maxPerPage() {
    return parseInt(this.getAttribute("maxPerPage"))
  }
  set maxPerPage(value) {
    this.setAttribute("maxPerPage", value)
  }
  set total(value) {
    this.setAttribute("total", value)
  }
  set page(value) {
    this.setAttribute("page", this.validatePage(value)||this.page)
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    this.shadowRoot.getElementById("page").value = this.page
    
    if(name == "page" && oldValue != newValue){
      this.dispatchEvent(new CustomEvent("page-change", {
        bubbles: false,
        cancelable: false,
        detail: {page: this.page, start: (this.page-1)*this.maxPerPage, end: ((this.page-1)*this.maxPerPage) + this.maxPerPage - 1}
      }));
    }
  }

  connectedCallback() {
    this.shadowRoot.getElementById("next").addEventListener("click", this.next)
    this.shadowRoot.getElementById("prev").addEventListener("click", this.prev)
    this.shadowRoot.getElementById("first").addEventListener("click",  this.first)
    this.shadowRoot.getElementById("last").addEventListener("click", this.last)
    this.shadowRoot.getElementById("page").addEventListener("change", this.pageInputChanged)
    

    if(!this.hasAttribute("page"))
      this.setAttribute("page", 1)
    if(!this.hasAttribute("maxPerPage"))
      this.setAttribute("maxPerPage", 20)
  }

  next(){
    this.page = this.validatePage(this.page + 1) || this.page
  }

  prev(){
    this.page = this.validatePage(this.page - 1) || this.page
  }

  first(){
    this.page = 1;
  }

  last(){
    this.page = Math.ceil(this.total / this.maxPerPage)
  }

  validatePage(page){
    return (page >= 1 && page <= Math.ceil(this.total / this.maxPerPage)) ? page : false
  }

  pageInputChanged(){
    this.page = this.shadowRoot.getElementById("page").value
  }

  disconnectedCallback() {
    this.shadowRoot.getElementById("next").removeEventListener("click", this.next)
    this.shadowRoot.getElementById("prev").removeEventListener("click", this.prev)
    this.shadowRoot.getElementById("first").removeEventListener("click",  this.first)
    this.shadowRoot.getElementById("last").removeEventListener("click", this.last)
    this.shadowRoot.getElementById("page").removeEventListener("change", this.pageInputChanged)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}