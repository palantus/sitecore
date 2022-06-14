let elementName = "field-list"

const template = document.createElement('template');
template.innerHTML = `
    <slot></slot>
  `;

class Element extends HTMLElement {
  constructor() {
    super();

    //this.attachShadow({ mode: 'open' });
    //this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.initFirst()
  }

  initFirst(){
    if(this.hasAttribute("initialized")) return;
    this.setAttribute("initialized", "true")

    let labelWidth = this.hasAttribute("labels-pct") ? `${parseInt(this.getAttribute("labels-pct"))}%` : "50%"
    let fieldWidth = this.hasAttribute("labels-pct") ? `${100-parseInt(this.getAttribute("labels-pct"))}%` : "50%"

    this.style.display = "block"
    let addedCount = 0;
    this.querySelectorAll("field-edit,field-ref")?.forEach((e, i) => {
      let lbl = document.createElement("label")
      lbl.setAttribute("for", e.getAttribute("id"))
      lbl.innerText = e.getAttribute("label") + ": ";
      lbl.style.width = labelWidth
      lbl.style.display = "inline-block"

      let field = this.querySelector(`:first-child`);
      field.style.width = fieldWidth
      field.style.display = "inline-block"
      field.style.verticalAlign = "middle";

      let div = document.createElement("div")
      div.classList.add("list-element")
      div.style.minHeight = "25px"
      div.appendChild(lbl)
      div.appendChild(field)
      div.classList.toggle("hidden", field.classList.contains("hidden"))

      this.appendChild(div)

      addedCount++;
    })
  }

  disconnectedCallback() {
  }

  refreshVisible(){
    this.querySelectorAll("div.list-element")?.forEach((e, i) => {
      let field = e.querySelector(`:last-child`);
      if(field.style.display == "none") e.style.display = "none"
    })
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}