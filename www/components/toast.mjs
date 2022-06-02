// Credits to Web Dev Simplified on YouTube for the initial code :)

const DEFAULT_OPTIONS = {
  autoClose: 5000,
  position: "top-right",
  onClose: () => {},
  onClick: () => {},
  canClose: true,
  showProgress: true,
  pauseOnHover: true,
  pauseOnFocusLoss: true,
}

export default class Toast {
  #toastElem
  #autoCloseInterval
  #progressInterval
  #removeBinded
  #clickedBinded
  #timeVisible = 0
  #autoClose
  #isPaused = false
  #unpause
  #pause
  #visibilityChange
  #shouldUnPause

  constructor(options) {
    this.mainContainer = document.querySelector("toast-container")
    if(!this.mainContainer){
      this.mainContainer = document.createElement("toast-container")
      document.body.append(this.mainContainer)
    }

    this.#toastElem = document.createElement("div")
    this.#toastElem.classList.add("toast")
    requestAnimationFrame(() => {
      this.#toastElem.classList.add("show")
    })
    this.#removeBinded = this.remove.bind(this)
    this.#clickedBinded = this.clicked.bind(this)
    this.#unpause = () => (this.#isPaused = false)
    this.#pause = () => (this.#isPaused = true)
    if(document.visibilityState !== "visible")
      this.#pause()
      
    this.#visibilityChange = () => {
      this.#shouldUnPause = document.visibilityState === "visible"
      if(document.visibilityState !== "visible"){
        this.#pause()
      } else {
        this.#unpause()
      }
    }
    this.update({ ...DEFAULT_OPTIONS, ...options })
  }

  set autoClose(value) {
    this.#autoClose = value
    this.#timeVisible = 0
    if (value === false) return

    let lastTime
    const func = time => {
      if (this.#shouldUnPause) {
        lastTime = null
        this.#shouldUnPause = false
      }
      if (lastTime == null) {
        lastTime = time
        this.#autoCloseInterval = requestAnimationFrame(func)
        return
      }
      if (!this.#isPaused) {
        this.#timeVisible += time - lastTime
        if (this.#timeVisible >= this.#autoClose) {
          this.remove()
          return
        }
      }

      lastTime = time
      this.#autoCloseInterval = requestAnimationFrame(func)
    }

    this.#autoCloseInterval = requestAnimationFrame(func)
  }

  set position(value) {
    const currentContainer = this.#toastElem.parentElement
    const selector = `.toast-container[data-position="${value}"]`
    const container = this.mainContainer.shadowRoot.querySelector(selector) || createContainer(value)
    container.append(this.#toastElem)
    if (currentContainer == null || currentContainer.hasChildNodes()) return
    currentContainer.remove()
  }

  set text(value) {
    this.#toastElem.textContent = value
  }

  set canClose(value) {
    this.#toastElem.classList.toggle("can-close", value)
    if (value) {
      this.#toastElem.addEventListener("click", this.#clickedBinded)
    } else {
      this.#toastElem.removeEventListener("click", this.#clickedBinded)
    }
  }

  set showProgress(value) {
    this.#toastElem.classList.toggle("progress", value)
    this.#toastElem.style.setProperty("--progress", 1)

    if (value) {
      const func = () => {
        if (!this.#isPaused) {
          this.#toastElem.style.setProperty(
            "--progress",
            1 - this.#timeVisible / this.#autoClose
          )
        }
        this.#progressInterval = requestAnimationFrame(func)
      }

      this.#progressInterval = requestAnimationFrame(func)
    }
  }

  set pauseOnHover(value) {
    if (value) {
      this.#toastElem.addEventListener("mouseover", this.#pause)
      this.#toastElem.addEventListener("mouseleave", this.#unpause)
    } else {
      this.#toastElem.removeEventListener("mouseover", this.#pause)
      this.#toastElem.removeEventListener("mouseleave", this.#unpause)
    }
  }

  set pauseOnFocusLoss(value) {
    if (value) {
      document.addEventListener("visibilitychange", this.#visibilityChange)
    } else {
      document.removeEventListener("visibilitychange", this.#visibilityChange)
    }
  }

  update(options) {
    Object.entries(options).forEach(([key, value]) => {
      this[key] = value
    })
  }

  remove() {
    cancelAnimationFrame(this.#autoCloseInterval)
    cancelAnimationFrame(this.#progressInterval)
    const container = this.#toastElem.parentElement
    this.#toastElem.classList.remove("show")
    this.#toastElem.addEventListener("transitionend", () => {
      this.#toastElem.remove()
      if (container.hasChildNodes()) return
      container.remove()
    })
    this.onClose()
  }

  clicked(){
    this.remove();
    this.onClick()
  }
}

function createContainer(position) {
  const container = document.createElement("div")
  container.classList.add("toast-container")
  container.dataset.position = position
  document.querySelector("toast-container").shadowRoot.append(container)
  return container
}


let elementName = "toast-container"
const template = document.createElement('template');
template.innerHTML = `
  <style>
    .toast {
      box-sizing: border-box;
      padding: .75rem;
      background-color: white;
      border: 1px solid #333;
      border-radius: .25em;
      position: relative;
      cursor: pointer;
      transition: transform 300ms ease-in-out;
      overflow: hidden;
      color: black;
    }
    
    .toast-container[data-position$="-right"] .toast {
      transform: translateX(110%);
    }
    
    .toast-container[data-position$="-left"] .toast {
      transform: translateX(-110%);
    }
    
    .toast-container[data-position="top-center"] .toast {
      transform: translateY(-100vh);
    }
    
    .toast-container[data-position="bottom-center"] .toast {
      transform: translateY(100vh);
    }
    
    .toast-container .toast.show {
      transform: translate(0, 0);
    }
    
    .toast.progress::before {
      content: "";
      position: absolute;
      height: 2px;
      width: calc(100% * var(--progress));
      background-color: blue;
      bottom: 0;
      left: 0;
      right: 0;
    }
    
    .toast.can-close::after {
      content: "\\00D7";
      position: absolute;
      top: 2px;
      right: 5px;
    }
    
    .toast-container {
      position: fixed;
      margin: 10px;
      width: 250px;
      display: flex;
      flex-direction: column;
      gap: .5rem;
    }
    
    .toast-container[data-position^="top-"] {
      top: 35px;
    }
    
    .toast-container[data-position^="bottom-"] {
      bottom: 0;
    }
    
    .toast-container[data-position$="-right"] {
      right: 0;
    }
    
    .toast-container[data-position$="-left"] {
      left: 0;
    }
    
    .toast-container[data-position$="-center"] {
      left: 50%;
      transform: translateX(-50%);
    }
  </style>
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
}

window.customElements.define(elementName, Element);

