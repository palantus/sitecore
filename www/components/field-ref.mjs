let elementName = "field-ref"

import {goto} from "../system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    span{
        cursor: pointer;
        color: var(--link);
        mix-blend-mode: difference;
        
    }
    span:hover{
        color: blue;
        color: var(--link-hover);
        mix-blend-mode: difference;
    }
  </style>
  <span><slot/></span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.shadowRoot.querySelector('span').addEventListener('click', e => {
      let ref = this.getAttribute('ref')
      if(ref.startsWith("http") || e.ctrlKey){
        window.open(ref, "_blank")
      } else {
        goto(ref)
      }
    });
    this.shadowRoot.querySelector('span').addEventListener('mouseup', (e) => {
        if(e.button==1){
            window.open(this.getAttribute('ref'), "_blank")
            return false
        }
    });
    if(!this.getAttribute("title"))
        this.shadowRoot.querySelector('span').title = this.getAttribute('ref');
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}