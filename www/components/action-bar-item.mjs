let elementName = "action-bar-item"
const template = document.createElement('template');
template.innerHTML = `
    <link rel='stylesheet' href='../css/global.css'>
    <style>
      span.item{
        display: inline-block;
        margin: 0px;
        padding: 3px 7px 2px 7px;
        cursor: pointer;
      }
      span.item:hover{
        background: var(--dark-back-hover)
      }

      span.container{
        user-select: none;
      }
      span.container.disabled{
        pointer-events: none;
        color: gray;
      }
    </style>
    <span class="container">
      <span class="item">
        <slot/>
      </span>
    </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    //this.shadowRoot.querySelector('h3').innerText = this.getAttribute('name');
    //this.shadowRoot.querySelector('img').src = this.getAttribute('avatar');
  }

  connectedCallback() {
    //this.shadowRoot.querySelector('#toggle-info').addEventListener('click', () => this.toggleInfo());
  }

  disconnectedCallback() {
    //this.shadowRoot.querySelector('#toggle-info').removeEventListener();
  }

  static get observedAttributes() {
    return ["disabled"];
  }  

  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "disabled":
        this.shadowRoot.querySelector("span.container").classList.toggle("disabled", this.hasAttribute("disabled"));
        break;
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}