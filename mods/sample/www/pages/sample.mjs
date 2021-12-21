const elementName = 'sample-page'

const template = document.createElement('template');
template.innerHTML = `

  
  <div id="container">
    <h1>Hello World!</h1>
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