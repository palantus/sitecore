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

    this.refreshHidden = this.refreshHidden.bind(this)
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
    this.querySelectorAll("field-edit,field-ref,list-inline-component")?.forEach((e, i) => {
      let lbl = document.createElement("label")
      lbl.setAttribute("for", e.getAttribute("id"))
      lbl.innerText = e.getAttribute("label") + ": ";
      lbl.style.width = labelWidth
      lbl.style.display = "inline-block"
      lbl.style.verticalAlign = "top"

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

      new ClassWatcher(field, 'hidden', this.refreshHidden, this.refreshHidden)

      this.appendChild(div)

      addedCount++;
    })
  }

  refreshHidden(){
    this.querySelectorAll(".list-element").forEach(e => {
      e.classList.toggle("hidden", e.querySelector("field-edit").classList.contains("hidden"))
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

class ClassWatcher {

  constructor(targetNode, classToWatch, classAddedCallback, classRemovedCallback) {
      this.targetNode = targetNode
      this.classToWatch = classToWatch
      this.classAddedCallback = classAddedCallback
      this.classRemovedCallback = classRemovedCallback
      this.observer = null
      this.lastClassState = targetNode.classList.contains(this.classToWatch)

      this.init()
  }

  init() {
      this.observer = new MutationObserver(this.mutationCallback)
      this.observe()
  }

  observe() {
      this.observer.observe(this.targetNode, { attributes: true })
  }

  disconnect() {
      this.observer.disconnect()
  }

  mutationCallback = mutationsList => {
      for(let mutation of mutationsList) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              let currentClassState = mutation.target.classList.contains(this.classToWatch)
              if(this.lastClassState !== currentClassState) {
                  this.lastClassState = currentClassState
                  if(currentClassState) {
                      this.classAddedCallback()
                  }
                  else {
                      this.classRemovedCallback()
                  }
              }
          }
      }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}