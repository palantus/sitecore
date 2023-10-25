const elementName = 'rightbar-card-component'

const template = document.createElement('template');
template.innerHTML = `
  <style>
    div {
      padding: 3px;
      background-color: #aaa;
    }
  </style>
  <div>
    <slot/>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}