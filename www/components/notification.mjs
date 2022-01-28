let elementName = "notification-component"

import api from "/system/api.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{
      padding: 5px;
      border: 1px solid gray;
      border-radius: 5px;
      box-shadow: 2px 2px 5px #777;
      background: rgba(255, 255, 255, 0.9);
      color: black;
    }

    p{
      font-size: 120%;
      margin-top: 0px;
      margin-bottom: 5px;
    }

    #body{

    }

    :host{
      display: block;
    }

    #bottombar{
      border-top: 1px solid #ddd;
      margin-top: 5px;
      font-size: 65%;
      padding-top: 3px;
      position: relative;
    }

    #close{
      position: absolute;
      right: 3px;
      padding-right: 3px;
      padding-left: 3px;
      cursor: pointer;
      user-select: none;
    }

    #close:hover{
      position: absolute;
      right: 3px;
      background-color: #eee;
    }

  </style>
  <div id="container">
    <p id="title">Untitled</p>
    <div id="body">
      <slot></slot>
      <div id="refs">
        <slot name="ref1"></slot>
        <slot name="ref2"></slot>
        <slot name="ref3"></slot>
      </div>
    </div>
    <div id="bottombar">
      <span id="timestamp"></span><span title="Dismiss" id="close">X</span>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.dismiss = this.dismiss.bind(this)

    if(this.hasAttribute("title"))
      this.shadowRoot.getElementById("title").innerText = this.getAttribute("title")

    if(this.hasAttribute("timestamp"))
      this.shadowRoot.getElementById("timestamp").innerText = this.getAttribute("timestamp")
    else
      this.shadowRoot.getElementById("timestamp").innerText = "N/A"

    //this.shadowRoot.querySelector('h3').innerText = this.getAttribute('name');
    //this.shadowRoot.querySelector('img').src = this.getAttribute('avatar');

  }

  async dismiss(){
    await api.post(`notifications/${this.getAttribute("id")}/dismiss`)
    this.style.display = "none"
  }

  connectedCallback() {
    this.shadowRoot.getElementById("close").addEventListener("click", this.dismiss)
  }

  disconnectedCallback() {
    this.shadowRoot.getElementById("close").removeEventListener("click", this.dismiss)
  }
}


window.customElements.define(elementName, Element);
export {Element, elementName as name}