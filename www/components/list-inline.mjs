let elementName = "list-inline-component"

/*
  Sample:

  <list-inline-component id="files"></list-inline-component>

  let files = [
    {id: 1, name: "file1.txt"},
    {id: 2, name: "file2.txt"},
    {id: 3, name: "file3.txt"}
  ]

  let fileContainer = this.shadowRoot.getElementById("files")
  fileContainer.setup({
    add: async () => {
      let newId = files.reduce((max, cur) => Math.max(cur.id, max), 0) + 1
      files.push({id: newId, name: await promptDialog("Enter new filename:", `file${newId}.txt`)})
    },
    validateAdd: () => true,
    remove: async file => {
      return files = files.filter(f => f.id != file.id) 
    },
    validateRemove: () => true,
    getData: async () => {
      return files
    },
    toHTML: file => `<span>${file.name}</span>`,
    click: file => alertDialog(file.name)
  })
*/

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{
      white-space: nowrap;
    }
    #items{
      display: inline-block;
    }
    .item{
      border: 1px solid var(--contrast-color-muted);
      padding: 5px;
      margin-right: 5px;
      display: inline-block;
    }
    .item.clickable{
      cursor: pointer;
      user-select: none;
    }
    .remove{
      border-left: 1px solid var(--contrast-color-muted);
      cursor: pointer;
      color: red;
      padding-left: 5px;
    }
    #add{
      cursor: pointer;
      color: transparent;  
      text-shadow: 0 0 0 green;
      display: inline-block;
    }
    .hidden{display: none !important;}
  </style>
  <span id="container">
    <span id="items">
    </span>
    <span id="add">&#x2795;</span>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshUI = this.refreshUI.bind(this)
    this.containerClicked = this.containerClicked.bind(this)
    this.addClicked = this.addClicked.bind(this)

    this.shadowRoot.getElementById("items").addEventListener("click", this.containerClicked)
    this.shadowRoot.getElementById("add").addEventListener("click", this.addClicked)

    if(this.hasAttribute("wrap"))
      this.shadowRoot.getElementById("container").style.whiteSpace = "initial"
    if(this.hasAttribute("disabled"))
      this.shadowRoot.getElementById("add").classList.toggle("hidden", true)
  }

  setup(setup){
    this._setup = setup
    this.refreshUI()
  }

  async refreshUI(){
    if(!this._setup) return;
    let data = this.data = await this._setup.getData(this, this._setup);
    if(!Array.isArray(data)) return;
    this.shadowRoot.getElementById("items").innerHTML = data.map((r, i) => `
        <span class="item${typeof this._setup.click === "function" ? " clickable" : ""}" data-index="${i}">
          <span class="content">${this._setup.toHTML(r)}</span>
          <span class="remove${this.hasAttribute("disabled")?" hidden" : ""}">&#10060;</span>
        </span>
      `).join("")

    this.shadowRoot.getElementById("add").classList.toggle("hidden", !!!this._setup.add)
    this.shadowRoot.querySelectorAll(".remove").forEach(e => e.classList.toggle("hidden", !!!this._setup.remove))
  }

  async containerClicked(e){
    let clickedE = e.composedPath()[0]
    if(!clickedE) return;
    let itemElement = clickedE.closest(".item")
    let index = parseInt(itemElement.getAttribute("data-index"))
    let item = this.data[index]
    if(clickedE.matches(".item > .remove")){
      if(typeof this._setup.validateRemove === "function"){
        if(!(await this._setup.validateRemove(item)))
          return;
      }
      
      if(typeof this._setup.remove === "function"){
        try{
          await this._setup.remove(item, this, this._setup)
        } catch(err){
          return;
        }
      }
      clickedE.closest(".item").remove()
      this.dispatchEvent(new CustomEvent("value-changed", {bubbles: false, cancelable: false}));
    } else if(typeof this._setup.click === "function" && clickedE.matches(".item .content *")){
      this._setup.click(item, this, this._setup)
    }
  }

  async addClicked(){
    if(typeof this._setup.add !== "function") return;

    if(typeof this._setup.validateAdd === "function"){
      if(!(await this._setup.validateAdd()))
        return;
    }

    this._setup.add(this, this._setup).then(() => {
      this.dispatchEvent(new CustomEvent("value-changed", {bubbles: false, cancelable: false}));
      this.refreshUI()
    })
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}