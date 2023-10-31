const elementName = 'rightbar-user-component'

import api from "../../system/api.mjs"
import "./rightcard.mjs"
import "../../components/field.mjs"
import { goto, state, stylesheets } from "../../system/core.mjs"
import { isSignedIn } from "../../system/user.mjs"
import { on, off } from "../../system/events.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{color: white; padding: 10px;}
    h2{margin: 0px; border-bottom: 1px solid lightgray; padding-bottom: 5px;}
    span{color: var(--accent-color-light);}
    #signedin{display: none;}
    #signedout{display: none;}
    button{width: 200px !important; margin-bottom: 10px;}
  </style>
  <div id="container">
      <h2>Status</h2>

      <p id="status"></p>
      <div id="signedin">
        <button class="styled" id="logout">Sign out</button>
        <br>
        <button class="styled" id="profile">View my profile</button>
        <br>
        <button class="styled" id="sethome">Set this page as home</button>
      </div>
      <div id="signedout">
        <button id="login">Sign in</button>
      </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global]
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.refreshData = this.refreshData.bind(this);

    this.shadowRoot.getElementById("login").addEventListener("click", () => goto("/login"))
    this.shadowRoot.getElementById("logout").addEventListener("click", () => {
      api.post("auth/logout").then(() => {
        api.logout();
        location.reload(); 
      })
    })
    this.shadowRoot.getElementById("profile").addEventListener("click", () => goto("/profile"))
    this.shadowRoot.getElementById("sethome").addEventListener("click", async () => {
      let path = state().path
      let home = path.length < 1 ? "/"
              : state().query.filter ? `${path}?filter=${state().query.filter}`
              : path
      await api.patch("me/setup", {home})
    })
    this.refreshData()
  }

  connectedCallback() {
    on("logged-in", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("logged-in", elementName)
  }

  async refreshData(){
    let me = (await api.query(`{
      me{
        id,
        msUsers{
          id,
          email
        }
      }
    }`))?.me

    this.shadowRoot.getElementById("status").innerHTML = 
            isSignedIn() ? `Signed in as <b>${me.id}</b></b>`
            : `You are not signed in`
    this.shadowRoot.getElementById("signedin").style.display = isSignedIn() ? "block" : "none"
    this.shadowRoot.getElementById("signedout").style.display = isSignedIn() ? "none" : "block"
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}