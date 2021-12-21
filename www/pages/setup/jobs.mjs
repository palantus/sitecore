const elementName = 'jobs-page'

import api from "/system/api.mjs"
import {on, off} from "/system/events.mjs"

const template = document.createElement('template');
template.innerHTML = `
<link rel='stylesheet' href='/css/global.css'>
<link rel='stylesheet' href='/css/searchresults.css'>
  <style>
    #container{
        padding: 10px;
    }
    table thead tr{
      border: 1px solid gray;
    }

  </style>

  <div id="container">
    <table>
        <thead>
            <tr>
              <th>Name</th>
              <th></th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this); //Make sure "this" in that method refers to this
    this.buttonClicked = this.buttonClicked.bind(this); //Make sure "this" in that method refers to this
    
    this.shadowRoot.querySelector("table").addEventListener("click", this.buttonClicked)

    this.refreshData();
  }

  async buttonClicked(evt){
    if(evt.target.classList.contains("run")){
      let id = evt.target.getAttribute("data-name");
      await api.post(`jobs/${id}/run`)
      console.log(id)
      this.refreshData()
    }
  }

  async refreshData(){
    let jobs = await api.get("jobs")
    let tab = this.shadowRoot.querySelector('table tbody')
    tab.innerHTML = "";

    for(let job of jobs){
        let row = document.createElement("tr")
        row.classList.add("result")
        row.innerHTML = `
            <tr>
                <td>${job.name}</td>
                <td><button data-name="${job.name}" class="run">Run</button></td>
            </tr>
        `
        tab.appendChild(row);
    }
  }

  connectedCallback() {
    on("changed-project", elementName, this.refreshData)
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-project", elementName)
    off("changed-page", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}