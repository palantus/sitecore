const elementName = 'rightbar-user-component'

import api from "/system/api.mjs"
import "/pages/rightbar/rightcard.mjs"
import "/components/field.mjs"
import { goto, state } from "/system/core.mjs"
import { isSignedIn } from "/system/user.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{color: white; padding: 10px;}
    h2{margin: 0px; border-bottom: 1px solid lightgray; padding-bottom: 5px;}
    span{color: var(--accent-color-light);}
    button{
      margin-bottom: 5px; 
      width: 100%;
      padding-top: 5px;
      padding-bottom: 5px;
      box-shadow: 1px 1px 5px #666;
      background: rgba(255, 255, 255, 1);
      border-radius: 7px;
      cursor: pointer;
      border: 1px solid #aaaa;
    }
    button:hover{
      box-shadow: 3px 3px 5px #333;
      background: rgba(255, 255, 255, 0.66);
    }
    #signedin{display: none;}
    #signedout{display: none;}
  </style>
  <div id="container">
      <h2>Status</h2>

      <p id="status"></p>
      <div id="signedin">
        <button id="logout">Sign out</button>
        <br>
        <button id="profile">View my profile</button>
        <br>
        <button id="sethome">Set this page as home</button>
      </div>
      <div id="signedout">
        <button id="login">Sign in</button>
      </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
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
  }

  disconnectedCallback() {
  }

  async refreshData(){
    let me = (await api.query(`{
      me{
        id,
        msUsers{
          id,
          email
        },
        activeMSUser
      }
    }`))?.me

    this.shadowRoot.getElementById("status").innerHTML = 
            isSignedIn() ? `Signed in as <b>${me.id}</b> with email <b>${me.msUsers?.find(ms => ms.id == me.activeMSUser)?.email || "N/A"}</b>`
            : `You are not signed in`
    this.shadowRoot.getElementById("signedin").style.display = isSignedIn() ? "block" : "none"
    this.shadowRoot.getElementById("signedout").style.display = isSignedIn() ? "none" : "block"
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}