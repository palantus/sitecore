const elementName = 'logs-page'

import api from "/system/api.mjs"
import {on, off} from "/system/events.mjs"
import {state, pushStateQuery} from "/system/core.mjs"

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

    table thead th:nth-child(1){min-width: 150px !important;}
    table thead th:nth-child(2){min-width: 120px !important;}
  </style>  

  <div id="container">
    <label for="logselect">Area: </label>
    <select id="logselect" value="vsts-work-items">
    </select>
    <br><br>

    <table>
        <thead>
            <tr>
              <th>Timestamp</th>
              <th>Area</th>
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
      this.shadowRoot.getElementById("logselect").innerHTML = `<option value=""></option>` + areas.map(e => `<option value="${e.id}">${e.id}</option>`).join("")

      this.shadowRoot.getElementById("logselect").value = state().query.area || ""

      this.shadowRoot.getElementById("logselect").addEventListener("change", () => {
        pushStateQuery({area: this.shadowRoot.getElementById("logselect").value})
        this.refreshData()
      })
      this.refreshData()
    })
  }
  async refreshData(){
    let data = await api.get(`system/log/${this.shadowRoot.getElementById("logselect").value||""}`)
    this.shadowRoot.getElementById("log").innerHTML = data.map(e => `<tr><td>${e.timestamp?.substr(0, 19).replace("T", " ")||"N/A"}</td><td>${e.area?.id || "N/A"}</td><td>${e.text || "N/A"}</td></tr>`).join("")
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