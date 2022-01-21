const elementName = 'labels-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-ref.mjs"
import "/components/field.mjs"
import "/components/data/searchhelp.mjs"
import {showDialog} from "/components/dialog.mjs"
import {on, off, fire} from "/system/events.mjs"
import {state, pushStateQuery, goto} from "/system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style>
    #container{
        position: relative;
    }
    table{
      width: 100%;
      margin-top: 5px;
      box-shadow: 0px 0px 10px gray;
      border: 1px solid gray;
    }
    table thead tr{
      border: 1px solid gray;
    }

    table thead th:nth-child(1){width: 50px}

    #resultinfo{margin-left: 5px;}
    pre{margin: 0px; display: inline;}
  </style>  

  <div id="container">
    <input id="search" type="text" placeholder="Enter query" value=""></input>
    <label for="includerev">Include reverse</label><input type="checkbox" id="includerev"></input>

    <table>
        <thead>
            <tr>
              <th>Id</th>
              <th>Properties</th>
              <th>Tags</th>
              <th>Relations</th>
              <th id="reverseHeader">Reverse relations</th>
            </tr>
        </thead>
        <tbody id="results">
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
    

    this.shadowRoot.getElementById("search").value = state().query.filter || ""
    this.refreshData();

    this.shadowRoot.getElementById('search').addEventListener("change", () => {
      this.queryChanged()
      pushStateQuery(this.lastQuery ? {filter: this.lastQuery, includeReverse: ""+this.lastIncludeReverse} : undefined)
    })

    this.shadowRoot.getElementById("includerev").addEventListener("change", () => {
      this.queryChanged()
      pushStateQuery(this.lastQuery ? {filter: this.lastQuery, includeReverse: ""+this.lastIncludeReverse} : undefined)
    })
  }

  async refreshData(){
    let query = this.shadowRoot.getElementById('search').value
    let includeReverse = this.shadowRoot.getElementById('includerev').checked
    let results = query ? await api.get(`system/db/query?q=${query}&includeReverse=${includeReverse ? "true" : "false"}`) : [];

    this.shadowRoot.getElementById("reverseHeader").style.display = includeReverse ? "table-cell" : "none"

    this.shadowRoot.getElementById("results").innerHTML = results.map(e => `
      <tr class="result" data-id="${e.id}">
        <td><a href="?filter=id:${e.id}">${e.id}</a></td>
        <td>${Object.keys(e.props).map(p => typeof e.props[p] === "object" ? `${p} = ${JSON.stringify(e.props[p])}` : `${p} = ${typeof e.props[p] === "string" ? e.props[p].replace( /(<([^>]+)>)/ig, '') : JSON.stringify(e.props[p])}`).join("<br/>")}</td>
        <td>${e.tags.map(t => `<a href="?filter=tag:%22${t}%22">${t}</a>`).join(", ")}</td>
        <td>${Object.keys(e.rels).map(r => `${r}: ${e.rels[r].map(ri => `<a href="?filter=id:${ri._id}">${ri._id}</a>`).join(", ")}`).join("<br/>")}</td>
        ${includeReverse ? `<td>${e.relsrev ? Object.keys(e.relsrev).map(r => `${r}: ${e.relsrev[r].map(ri => `<a href="?filter=id:${ri._id}">${ri._id}</a>`).join(", ")}`).join("<br/>") : ""}</td>` : ""}
      </tr>
    `).join("")
    
  }

  async queryChanged(q = this.shadowRoot.getElementById('search').value, includeReverse = this.shadowRoot.getElementById('includerev').checked){
    if(q == this.lastQuery && includeReverse == this.lastIncludeReverse)
      return;

    this.lastQuery = q;
    this.lastIncludeReverse = includeReverse
    this.shadowRoot.getElementById('search').value = q || "last:25";
    this.shadowRoot.getElementById('includerev').checked = !!includeReverse

    this.refreshData();
  }

  labelClick(e){
    let id = e.target.closest("tr").getAttribute("data-labelid");
    
  }

  connectedCallback() {
    this.shadowRoot.getElementById("search").focus();
    on("changed-page", elementName, this.refreshData)
    on("changed-page-query", elementName, (query) => this.queryChanged(query.filter || "", query.includeReverse == "true"))
  }

  disconnectedCallback() {
    off("changed-page", elementName)
    off("changed-page-query", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}