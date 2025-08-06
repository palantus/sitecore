const elementName = 'breadcrumbs-component'

import {goto, siteTitle, ready} from "../system/core.mjs"
import {fire} from "../system/events.mjs"
const template = document.createElement('template');
template.innerHTML = `
    <style>
      #path span:first-child{
        border-radius: 5px 0px 0px 5px;
      }
      #path span:last-child{
        border-radius: 0px 5px 5px 0px;
      }
      #path span{
        padding: 2px;
        padding-left: 10px;
        padding-right: 10px;
        height: 20px;
        line-height: 20px;
        display: inline-block;
      }
      #path span.part{
        cursor: pointer;
        background: rgba(200, 200, 200, 0.3);
      }
      #path span.divider{
        background: var(--accent-back);
      }
    </style>

    <div id="path"></div>
    
`;

class IndexPage extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.itemClicked = this.itemClicked.bind(this);

    this.nameKey = this.getAttribute("nameKey") || "name";
    this.idKey = this.getAttribute("idKey") || "id";

    this.shadowRoot.getElementById("path").addEventListener("click", this.itemClicked);
  }

  setPath(path){
    let pathArray = Array.isArray(path) ? path : path.split('/').map(p => p.trim());
    this.shadowRoot.getElementById("path").innerHTML = pathArray.toReversed().map(p => `
      <span class="part" data-id="${p[this.idKey]||p[this.nameKey]||p}">${p[this.nameKey]||p}</span>
    `.trim()).join('<span class="divider">&gt;</span>');
  }

  itemClicked(e){
    let id = e.target.dataset.id;
    this.dispatchEvent(new CustomEvent("item-clicked", {detail: {id}}))
  }
  
  static get observedAttributes() {
    return ["path"];
  }  

  attributeChangedCallback(name, oldValue, newValue) {
    if(name == "path"){
      this.setPath(newValue);
    }
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, IndexPage);

export {IndexPage as Element, elementName as name}
