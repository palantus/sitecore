let elementName = "richtext-component"

import "/libs/easymde.min.js"

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="/libs/easymde.min.css">
  <link rel="stylesheet" href="/libs/font-awesome.min.css">
  <style>
    .editor-toolbar{
      background: rgba(255, 255, 255, 0.4);
      opacity: 1;
    }
  </style>

  <div id="container">
    <textarea id="editor"></textarea>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    let toolbar = []

    if(!this.hasAttribute("nosave")){
      toolbar.push({
        name: "save",
        action: () => this.dispatchEvent(new CustomEvent("save", {detail: {text: this.simplemde.value()}, bubbles: true, cancelable: false})),
        className: "fa fa-save",
        title: "Save",
      })
    }
    if(this.hasAttribute("submit")){
      toolbar.push({
        name: "submit",
        action: () => this.dispatchEvent(new CustomEvent("submit", {detail: {text: this.simplemde.value()}, bubbles: true, cancelable: false})),
        className: "fa fa-paper-plane",
        title: "Submit",
      })
    }
    if(!this.hasAttribute("noclose")){
      toolbar.push({
        name: "close",
        action: () => this.dispatchEvent(new CustomEvent("close", {detail: {text: this.simplemde.value()}, bubbles: true, cancelable: false})),
        className: "fa fa-close",
        title: "Close",
      })
    }

    if(toolbar.length > 0){
      toolbar.push("|")
    }

    this.simplemde = new EasyMDE({
      element: this.shadowRoot.getElementById("editor"),
      spellChecker: false,
      //showIcons: ["code", "table"]
      toolbar: [
        ...toolbar,
        "bold", "italic", "heading", "|", "code", "quote", "unordered-list", "ordered-list", "|", "link", "image", "table", "|", "preview", "side-by-side", "fullscreen"
      ]
    });
  }

  focus(){
    this.simplemde.codemirror.focus()
  }

  value(newValue = null){
    if(typeof newValue === "string"){
      this.simplemde.value(newValue)
    }
    return this.simplemde.value()
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export { Element, elementName as name }