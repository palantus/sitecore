let elementName = "action-bar-menu"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .dropdown:focus-within > .link,
    .link:hover {
      color: black;
    }
    
    .dropdown {
      position: relative;
      display: inline-block;
    }

    .dropdown-menu {
      position: absolute;
      left: 0;
      top: calc(100% + .25rem);
      padding: .75rem;
      border-radius: .25rem;
      box-shadow: 0 2px 5px 0 rgba(0, 0, 0, .5);
      background: var(--dark-back);
      opacity: 0;
      pointer-events: none;
      transform: translateY(-10px);
      transition: opacity 150ms ease-in-out, transform 150ms ease-in-out;
      color: white;
      min-width: 200px; 
      backdrop-filter: blur(5px);
      z-index: 10;
    }

    .dropdown:focus-within{
      z-index: 2;
    }
    
    .dropdown:focus-within > span + .dropdown-menu {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
      cursor: initial;
    }
    #button:after{
      content: '';
      border: 5px solid transparent;
      border-top: 6px solid #555;
      margin-left: 4px;
      margin-bottom: 2px;
      display: inline-block;
      vertical-align: bottom;

      position: absolute;
      left: calc(100% / 2 - 10px);
      top: calc(100% - 2px);
  }
  </style>
  <span class="dropdown" data-dropdown>
    <span tabindex=0 id="button"></span>
    <span class="dropdown-menu information-grid">
      <slot></slot>
    </span>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById("button").innerText = this.getAttribute("label") || "Menu"
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}