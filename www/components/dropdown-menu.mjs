let elementName = "dropdown-menu-component"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #button{
      cursor: pointer;
    }
    
    #dropdown {
      position: relative;
      display: inline-block;
    }

    #dropdown-menu {
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
      backdrop-filter: blur(5px);
      z-index: 10;
    }

    #dropdown-menu.left{
      right: 0;
      left: initial;
    }

    #dropdown:focus-within{
      z-index: 2;
    }
    
    #dropdown:focus-within > span + #dropdown-menu {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
      cursor: initial;
    }
  </style>
  <span id="dropdown">
    <span tabindex=0 id="button"><slot name="label"><slot></span>
    <span id="dropdown-menu">
      <slot name="content"></slot>
    </span>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    if(this.hasAttribute("label")){
      this.shadowRoot.getElementById("button").innerHtml = this.getAttribute("label")
    }

    if(this.hasAttribute("width")){
      this.shadowRoot.getElementById("dropdown-menu").style.minWidth = this.getAttribute("width")
    }

    let rect = this.shadowRoot.getElementById("button").getBoundingClientRect()
    if(rect.x + (rect.width / 2) > window.innerWidth / 2){
      this.shadowRoot.getElementById("dropdown-menu").classList.add("left")
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}