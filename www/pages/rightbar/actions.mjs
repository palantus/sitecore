const elementName = 'rightbar-actions-component'

import {api, getUser} from "/system/api.mjs"
import "/pages/rightbar/rightcard.mjs"
import {onMessage, offMessage} from "/system/message.mjs"
import "/components/field.mjs"
import {on, off} from "/system/events.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{color: white; padding: 10px;}
    h2{margin: 0px; border-bottom: 1px solid lightgray; padding-bottom: 5px;}
    span{color: var(--accent-color-light);}
    #runbooks div{white-space: nowrap;}
    #runbooks span.status{display: inline-block; width: 40px;}
  </style>
  <div id="container">
      <h2>Recent runbooks</h2>
      <div id="runbooks">
      </div>
      <br>
      <h2>Running actions</h2>
      <div id="running">
      </div>
      <br>
      <h2>Upcoming actions</h2>
      <div id="upcoming">
      </div>
      <br>
      <h2>Recent actions</h2>
      <div id="finished">
      </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.refreshData = this.refreshData.bind(this)
  
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.addEventListener("opened", this.refreshData)
  }

  async refreshData(){
    let [runbooks, active, finished, ready] = await Promise.all([
      api.get("runbooks/exec/recent"),
      api.query(`query ActionList($input:PageableSearchArgsType){
          actions(input: $input){
            nodes{
              id, context, owner{name}, type{name, title}, parms, state, error
            },
            pageInfo{
              totalCount
            }
          }
      }`, {input: {query: `owner:${getUser().id} state:running`, reverse: true}}),
      api.query(`query ActionList($input:PageableSearchArgsType){
          actions(input: $input){
            nodes{
              id, context, owner{name}, type{name, title}, parms, state, error
            },
            pageInfo{
              totalCount
            }
          }
      }`, {input: {query: `owner:${getUser().id} finished:today`, reverse: true}}),
      api.query(`query ActionList($input:PageableSearchArgsType){
          actions(input: $input){
            nodes{
              id, context, owner{name}, type{name, title}, parms, state, error
            },
            pageInfo{
              totalCount
            }
          }
      }`, {input: {query: `owner:${getUser().id} state:ready created:today`, reverse: true}})
    ])

    let rbStateToText = (rb) => rb.state == "error" ? "ERROR" : rb.state == "timeout" ? "TIMEDOUT" : `${Math.floor((rb.done/rb.total)*100)}%`;
    this.shadowRoot.getElementById("runbooks").innerHTML = runbooks.map(a => `<div><span title="${a.id}"><span class="status">${rbStateToText(a)}: </span><field-ref ref="/actions?filter=exec:${a.id}">${a.title}</field-ref></span></div>`).join("");
    this.shadowRoot.getElementById("running").innerHTML = active.actions.nodes.map(a => `<div><span><field-ref ref="/action/${a.id}">${a.id}</field-ref>: ${a.type.title}</span></div>`).join("");
    this.shadowRoot.getElementById("finished").innerHTML = finished.actions.nodes.map(a => `<div><span><field-ref ref="/action/${a.id}">${a.id}</field-ref>: ${a.type.title}</span></div>`).join("");
    this.shadowRoot.getElementById("upcoming").innerHTML = ready.actions.nodes.map(a => `<div><span><field-ref ref="/action/${a.id}">${a.id}</field-ref>: ${a.type.title}</span></div>`).join("");
  }

  connectedCallback() {
    onMessage("action-state-changed", elementName, this.refreshData)
    on("changed-project", elementName, this.refreshData)
  }

  disconnectedCallback() {
    offMessage("action-state-changed", elementName);
    off("changed-project", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}