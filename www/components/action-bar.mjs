let elementName = "action-bar"
const template = document.createElement('template');
template.innerHTML = `
    <style>
        .bar{
            padding: 5px;
            /*border-bottom: 1px solid rgba(0, 0, 0, 0.2);*/
            content: " ";
            display: flex; 
            clear: both;
            /*box-shadow: 0px 3px 3px rgba(0, 0, 0, 0.05);*/
            /*position: fixed;*/
            /*width: 100%;*/
            background-color: var(--dark-back);
        }
    </style>
    <div class="bar">
        <slot/>
    </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    //this.shadowRoot.querySelector('h3').innerText = this.getAttribute('name');
    //this.shadowRoot.querySelector('img').src = this.getAttribute('avatar');

    // Causes weird behaviour when scrolled down and closing a dialog (jumps down)
    /*
    this.style.position = "sticky"
    this.style.top = "0"
    this.style.zIndex = 5;
    */

    if(this.hasAttribute("less-transparency"))
      this.shadowRoot.querySelector(".bar").style.backgroundColor = "var(--dark-back-op)"
  }

  connectedCallback() {
    //this.shadowRoot.querySelector('#toggle-info').addEventListener('click', () => this.toggleInfo());
  }

  disconnectedCallback() {
    //this.shadowRoot.querySelector('#toggle-info').removeEventListener();
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}