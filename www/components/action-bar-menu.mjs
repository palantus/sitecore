let elementName = "action-bar-menu"

import "/components/dropdown-menu.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #label-container{
      position: relative;
    }
    #label-container:after{
      content: '';
      border: 5px solid transparent;
      border-top: 6px solid var(--contrast-color);
      margin-left: 4px;
      margin-bottom: 2px;
      display: inline-block;
      vertical-align: bottom;

      position: absolute;
      left: calc(100% / 2 - 10px);
      top: calc(100% - 2px);
    }
  </style>

  <span id="container">
    <dropdown-menu-component class="postoptions" title="Options" width="300px">
      <span slot="label" id="label-container" tabindex="0"><span id="label"></span></span>
      <div slot="content">
        <slot></slot>
      </div>
    </dropdown-menu-component>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById("label").innerText = this.getAttribute("label") || "Menu"

    if(this.hasAttribute("width")){
      this.shadowRoot.querySelector("dropdown-menu-component").setAttribute("width", this.getAttribute("width"))
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}