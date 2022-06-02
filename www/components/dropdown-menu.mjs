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
      box-shadow: 0px 0px 7px var(--dark-back);
      background: var(--dark-back-op);
      opacity: 0;
      pointer-events: none;
      transform: translateY(-10px);
      transition: opacity 150ms ease-in-out, transform 150ms ease-in-out;
      color: white;
      z-index: 10;
      border: 1px solid var(--contrast-color-muted);
      border-radius: 5px;
      display: none;
    }

    @supports (backdrop-filter: blur(0)) {
      .dropdown-menu {
          /*background: var(--dark-back);*/
          background: var(--dark-back-op);
          backdrop-filter: blur(15px);
      }
    }

    #dropdown:focus-within{
      z-index: 2;
    }
    
    #dropdown:focus-within > span + .dropdown-menu:not(.hidden) {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
      cursor: initial;
    }
  </style>
  <span id="dropdown">
    <span tabindex=0 id="button"><slot name="label"><slot name="button"><slot></span>
    <span id="dropdown-menu" class="dropdown-menu hidden">
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
    this.show = this.show.bind(this)

    this.shadowRoot.getElementById("button").addEventListener("click", this.show)
  }

  async show(){
    this.shadowRoot.getElementById("dropdown-menu").style.display = "block"
    if(this.hasAttribute("label")){
      this.shadowRoot.getElementById("button").innerHtml = this.getAttribute("label")
    }

    if(this.hasAttribute("width")){
      this.shadowRoot.getElementById("dropdown-menu").style.minWidth = this.getAttribute("width")
    }

    await new Promise(r => setTimeout(r, 0)) // Causes new "width" calculation (for position) and adds element to DOM (for animation)
    let menu = this.shadowRoot.getElementById("dropdown-menu");
    let button = this.shadowRoot.getElementById("button")
    this.mainRect = document.getElementById("main").getBoundingClientRect()
    this.menuRect = menu.getBoundingClientRect()
    this.buttonRect = button.getBoundingClientRect()
    this.boundingRect = menu.offsetParent?.getBoundingClientRect() || this.buttonRect

    this.refreshUI()
  }

  refreshUI(){

    this.shadowRoot.getElementById("dropdown-menu").classList.remove("hidden")
    let alwaysShow = this.hasAttribute("always-show")
    this.shadowRoot.getElementById("dropdown-menu").classList.toggle("dropdown-menu", !alwaysShow)

    if(alwaysShow){
      let menu = this.shadowRoot.getElementById("dropdown-menu");
      menu.style.left = "initial"
      menu.style.top = "initial"
    } else {
      let menu = this.shadowRoot.getElementById("dropdown-menu");
      
      let optimalX = this.buttonRect.x - this.boundingRect.x - this.menuRect.width/2
      let x = Math.max(this.mainRect.x - this.boundingRect.x, Math.min(this.mainRect.right - this.boundingRect.x - this.menuRect.width, optimalX))
      menu.style.left = `${x}px`

      let optimalY = this.buttonRect.y - this.boundingRect.y + this.buttonRect.height + 5
      let y = Math.max(this.mainRect.y - this.boundingRect.y, Math.min(this.mainRect.bottom - this.boundingRect.y - this.menuRect.height, optimalY))
      menu.style.top = `${y}px`
      
      console.log({
        mainRect: this.mainRect,
        menuRect: this.menuRect,
        buttonRect: this.buttonRect,
        boundingRect: this.boundingRect,
        optimalX,
        x
      })
      
    }
  }
  async connectedCallback() {
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