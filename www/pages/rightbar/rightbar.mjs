const elementName = 'rightbar-component'

import "/pages/rightbar/user.mjs"
import "/pages/rightbar/notifications.mjs"
import "/components/field-ref.mjs"
import "/components/field.mjs"
import {isMobile} from "/system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
  </style>
  <div id="container">
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

  static get observedAttributes() {
    return ['page'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'page':
        this.shadowRoot.querySelectorAll("#container .item").forEach(e => e.style.display = "none")
        if(!newValue){
          document.getElementById("grid-container").classList.remove("rightvisible");
          return;
        }
        document.getElementById("grid-container").classList.add("rightvisible");
        if(isMobile()){
          document.getElementById("grid-container").classList.add("collapsed")
        }
        import(`/pages/rightbar/${newValue}.mjs`).then(() => {
          let componentName = `rightbar-${newValue}-component`;

          let element = this.shadowRoot.querySelector(componentName);
          if(!element){
            element = document.createElement(componentName)
            this.shadowRoot.getElementById("container").appendChild(element)
            element.classList.add("item")
          }
          element.style.display = "block"
          element.dispatchEvent(new CustomEvent("opened", {bubbles: true, cancelable: false}));
        })
        break;
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}