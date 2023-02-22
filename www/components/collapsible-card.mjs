let elementName = "collapsible-card"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    .collapsible {
      background-color: #777;
      cursor: pointer;
      padding: 18px;
      width: 100%;
      border: none;
      text-align: left;
      outline: none;
      font-size: 15px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      transition: all 0.2s linear;
      border-bottom: 1px solid var(--dark-back);
    }
    
    .collapsible:hover {
      background-color: var(--dark-hover-back);
    }
    
    .collapsible:after {
      transition: all 0.2s linear;
      transform: rotate(-90deg);
      content: " ▾";
      font-weight: bold;
      float: left;
      margin-right: 10px;
    }

    .collapsible.active {
      border-bottom: 1px solid var(--contrast-color-muted);
    }
    
    .active:after {
      content: " ▾";
      transform: rotate(0deg);
    }
    
    .content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.2s ease-out;
      background: rgba(0, 0, 0, 0.7);
    }
    #container{
      border: 1px solid var(--contrast-color-muted);
    }
  </style>

  <div id="container">
    <button id="button" class="collapsible"><slot name="title"></slot></button>
    <div id="content" class="content">
      <slot></slot>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById("button").addEventListener("click", () => {
      let content = this.shadowRoot.getElementById("content");
      let button = this.shadowRoot.getElementById("button");

      let active = !button.classList.contains("active")
      button.classList.toggle("active", active);
      content.style.maxHeight = `${content.scrollHeight}px`
      if(active){
        content.style.maxHeight = `${content.scrollHeight}px`
        setTimeout(() => content.style.maxHeight = "initial", 200)
      } else {
        setTimeout(() => content.style.maxHeight = "0px", 1);
      }
    })

    if(this.hasAttribute("open")){
      this.shadowRoot.getElementById("content").style.maxHeight = "initial"
      this.shadowRoot.getElementById("button").classList.toggle("active", true);
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}