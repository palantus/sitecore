const elementName = 'logs-page'

import api from "/system/api.mjs"
import {on, off} from "/system/events.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style>
    #container{
        position: relative;
        padding: 10px;
    }
    table{
      width: 100%;
    }
    table thead tr{
      border-bottom: 1px solid gray;
    }

    table thead th:nth-child(1){width: 150px}
  </style>  

  <div id="container">
    <label for="logselect">Log: </label>
    <select id="logselect" value="vsts-work-items">
    </select>
    <br><br>

    <table>
        <thead>
            <tr>
              <th>Timestamp</th>
              <th>Text</th>
            </tr>
        </thead>
        <tbody id="log">
        </tbody>
    </table>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);

    api.get("system/logareas").then(areas => {
      this.shadowRoot.getElementById("logselect").innerHTML = areas.map(e => `<option value="${e.id}">${e.id}</option>`).join("")
      this.shadowRoot.getElementById("logselect").addEventListener("change", this.refreshData)
      this.refreshData()
    })
  }
  async refreshData(){
    let data = await api.get(`system/log/${this.shadowRoot.getElementById("logselect").value||""}`)
    this.shadowRoot.getElementById("log").innerHTML = data.map(e => `<tr><td>${e.timestamp.substr(0, 19).replace("T", " ")}</td><td>${e.text}</td></tr>`).join("")
  }

  connectedCallback() {
    on("changed-project",elementName, this.refreshData)
    on("changed-page", elementName, this.refreshData)
    this.timer = setInterval(this.refreshData, 3000)
  }

  disconnectedCallback() {
    off("changed-project", elementName)
    off("changed-page", elementName)
    clearInterval(this.timer)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}