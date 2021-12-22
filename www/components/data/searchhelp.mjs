let elementName = "searchhelp-component"

import api from "/system/api.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    span{
      position: relative;
      left: -20px;
      cursor: help;
    }
  </style>
  <span id="searchhelp">?</span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    let path = this.getAttribute("path");
    if(path){
      api.get(path).then(tokens => {
        this.shadowRoot.getElementById("searchhelp").setAttribute("title", tokens.map(t => `${t.keywords[0]||"<none>"}: ${t.title}\n`).join("")||`Search help is not yet available for type ${type}`)
      })
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}