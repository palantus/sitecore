let elementName = "context-menu"

import "/components/dropdown-menu.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #items > button{
      display: block;
      background: none;
      color: inherit;
      border: none;
      padding: 0;
      font: inherit;
      cursor: pointer;
      outline: inherit;
    }
    #items > button:hover{
      background-color: var(--table-hover);
    }
  </style>

  <dropdown-menu-component class="options" title="Options" >
      <span slot="label" tabindex="0">&vellip;</span>
      <div slot="content">
        <div id="items">
        </div>
      </div>
  </dropdown-menu-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.dropMenu = this.shadowRoot.querySelector("dropdown-menu-component")

    this.shadowRoot.getElementById("items").innerHTML = [...this.querySelectorAll("span")].map(e => `<button data-button="${e.getAttribute("data-button")}">${e.innerText}</button>`).join("")
    this.shadowRoot.getElementById("items").addEventListener("click", e => {
      if(e.target.tagName !== "BUTTON") return;
      this.dispatchEvent(new CustomEvent("item-clicked", {bubbles: true, cancelable: false, detail: e.target.getAttribute("data-button")}))
    })
  }

  static get observedAttributes() {
    return ["width"];
  }  

  attributeChangedCallback(name, oldValue, newValue) {
    this.dropMenu.setAttribute(name, newValue)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}