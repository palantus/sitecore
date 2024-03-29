const elementName = 'systemtools-page'

import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"
import {apiURL, goto} from "../../system/core.mjs"
import api from "../../system/api.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
  </style>  

  <action-bar>
      <action-bar-item id="dbbrowse-btn">Browse DB</action-bar-item>
      <action-bar-item id="graphql-btn">GraphQL UI</action-bar-item>
  </action-bar>

  <div id="container">
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById("dbbrowse-btn").addEventListener("click", () => goto("/system/db"))
    this.shadowRoot.getElementById("graphql-btn").addEventListener("click", () => api.get("me/token").then(token => window.open(`${apiURL()}/graphql?access_token=${token.token}`)))
  }


  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}