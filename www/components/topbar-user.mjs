let elementName = "topbar-user-component"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    img{
      cursor: pointer;
      width: 26px;
      filter: grayscale(100%);
      top: 4px;
    }
    img:hover{
      filter: grayscale(80%);
    }
  </style>
  <span id="container">
    <img class="profile" id="user-toggle" src="/img/profile.png" alt="Profile" title="Profile"/>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.setAttribute("page", "user");
  }
}


window.customElements.define(elementName, Element);
export { Element, elementName as name }