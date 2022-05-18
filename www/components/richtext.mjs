let elementName = "richtext-component"

import "https://unpkg.com/easymde/dist/easymde.min.js"

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="https://unpkg.com/easymde/dist/easymde.min.css">
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css">
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

    this.saveClicked = this.saveClicked.bind(this)
    this.closeClicked = this.closeClicked.bind(this)

    this.simplemde = new EasyMDE({
      element: this.shadowRoot.getElementById("editor"),
      spellChecker: false,
      //showIcons: ["code", "table"]
      toolbar: [
        {
          name: "save",
          action: () => this.saveClicked(),
          className: "fa fa-save",
          title: "Save",
        },
        {
          name: "close",
          action: () => this.closeClicked(),
          className: "fa fa-close",
          title: "Close",
        },
        "|", "bold", "italic", "heading", "|", "code", "quote", "unordered-list", "ordered-list", "|", "link", "image", "table", "|", "preview", "side-by-side", "fullscreen"
      ]
    });
  }

  saveClicked(){
    this.dispatchEvent(new CustomEvent("save", {detail: {text: this.simplemde.value()}, bubbles: true, cancelable: false}));
  }

  closeClicked(){
    this.dispatchEvent(new CustomEvent("close", {detail: {text: this.simplemde.value()}, bubbles: true, cancelable: false}));
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