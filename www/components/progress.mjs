let elementName = "progress-bar"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      width: 100%;
    }
    
    #progress-bar-container {
      height: 2rem;
      border-radius: 2rem;
      position: relative;
      overflow: hidden;
      transition: all 0.5s;
      will-change: transform;
      box-shadow: 0 0 5px var(--contrast-color-muted);
    }
    
    #progress-bar {
      position: relative;
      height: 100%;
      width: 100%;
      content: "";
      background-color: var(--accent-back);
      top:0;
      bottom: 0;
      left: -100%;
      border-radius: inherit;
      display: flex;
      justify-content: center;
      align-items:center;
    }
    #progress-bar-container.complete{
      /*box-shadow: 0 0 5px #4895ef;*/
    }
    #progress-bar-container.complete #progress-bar{
      background-color: var(--accent-back-light);
    }

    #progress-bar-text{
      position: absolute;
      height: 100%;
      width: 100%;
      top:0;
      bottom: 0;
      left: 0;
      display: flex;
      justify-content: center;
      align-items:center;
    }
  </style>
  <div id="progress-bar-container">
    <div id="progress-bar"></div>
    <span id="progress-bar-text">Uploaded Successfully!</span>
  </div>
</div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    if(this.hasAttribute("value"))
      this.setValue(parseInt(this.getAttribute("value")))
    else
      this.setValue(0)

    /*
    setInterval(() => {
      this.setAttribute("value", parseInt(this.getAttribute("value")) + 1)
    }, 100)
    */
  }

  static get observedAttributes() {
    return ["value"];
  }

  setValue(value){
    let progressBar = this.shadowRoot.getElementById("progress-bar")
    let progressBarText = this.shadowRoot.getElementById("progress-bar-text")
    let progressBarContainer = this.shadowRoot.getElementById("progress-bar-container")

    progressBar.style.left = `${-100 + Math.min(100, value)}%`
    progressBarText.innerText = value >= 100 ? (this.getAttribute("complete-text") || "Done") : `${Math.min(100, value)}%`
    progressBarContainer.classList.toggle("complete", value >= 100)
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "value":
        if(newValue != oldValue) {
          this.setValue(parseInt(newValue))
        }
        break;
    }
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}