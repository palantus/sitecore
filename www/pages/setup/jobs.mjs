const elementName = 'jobs-page'

import api from "/system/api.mjs"
import {on, off} from "/system/events.mjs"
import "/components/field-ref.mjs"
import { alertDialog } from "/components/dialog.mjs"

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
    <h1>System jobs</h1>

    <p>Jobs can be added to the folder "jobs" in your storage folder or as a file (if files mod is installed) with tag "system-job".</p>
    <p>Please remember to be VERY careful when running a file that you do not own and/or control.</p>

    <table>
        <thead>
            <tr>
              <th>Name</th>
              <th>Source</th>
              <th>Owner</th>
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
      let output = await api.post(`jobs/${id}/run`)
      alertDialog(`<pre>${JSON.stringify(output, null, 2)}</pre>`, {title: "Output"})
      this.refreshData()
    }
  }

  async refreshData(){
    let jobs = await api.get("jobs")
    let tab = this.shadowRoot.querySelector('table tbody')
    tab.innerHTML = "";

    for(let job of jobs.sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1)){
        let row = document.createElement("tr")
        row.classList.add("result")
        row.innerHTML = `
            <tr>
                <td>${job.source == "files" ? `<field-ref ref="/file/${job.fileId}">${job.name}</field-ref>` : job.name}</td>
                <td>${job.source}</td>
                <td>${job.owner ? `${job.owner.name} (${job.owner.id})` : ""}</td>
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