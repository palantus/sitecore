let elementName = "dropdown-menu-component"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #button{
      cursor: pointer;
      user-select: none;
    }
    
    #dropdown {
      display: inline-block;
    }

    .dropdown-menu {
      position: absolute;
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

    #dropdown:focus-within{
      z-index: 2;
    }
    
    #dropdown:focus-within > span + .dropdown-menu {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
      cursor: initial;
    }
  </style>
  <span id="dropdown">
    <span tabindex=0 id="button"><slot name="label"><slot name="button"><slot></span>
    <span id="dropdown-menu" class="dropdown-menu">
      <slot name="content"></slot>
    </span>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshUI = this.refreshUI.bind(this)

    if(this.hasAttribute("label")){
      this.shadowRoot.getElementById("button").innerHtml = this.getAttribute("label")
    }

    if(this.hasAttribute("width")){
      this.shadowRoot.getElementById("dropdown-menu").style.minWidth = this.getAttribute("width")
    }

    this.shadowRoot.getElementById("dropdown").addEventListener("focusin", this.refreshUI)
  }

  refreshUI(){
    let alwaysShow = this.hasAttribute("always-show")

    this.shadowRoot.getElementById("dropdown-menu").classList.toggle("dropdown-menu", !alwaysShow)

    if(alwaysShow){
      let menu = this.shadowRoot.getElementById("dropdown-menu");
      menu.style.left = "initial"
      menu.style.top = "initial"
    } else {
      let button = this.shadowRoot.getElementById("button")
      let menu = this.shadowRoot.getElementById("dropdown-menu");
      let mainRect = document.getElementById("main").getBoundingClientRect()
      let menuRect = menu.getBoundingClientRect()
      let buttonRect = button.getBoundingClientRect()
      let boundingRect = menu.offsetParent.getBoundingClientRect()
      
      let optimalX = buttonRect.x - boundingRect.x - menuRect.width/2
      let x = Math.max(mainRect.x - boundingRect.x, Math.min(mainRect.right - boundingRect.x - menuRect.width, optimalX))
      menu.style.left = `${x}px`

      let optimalY = buttonRect.y - boundingRect.y + buttonRect.height + 5
      let y = Math.max(mainRect.y - boundingRect.y, Math.min(mainRect.bottom - boundingRect.y - menuRect.height, optimalY))
      menu.style.top = `${y}px`
    }
  }

  static get observedAttributes() {
    return ["always-show"];
  }  

  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "always-show":
        this.refreshUI()
        break;
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}