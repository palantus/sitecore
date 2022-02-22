import { alertDialog } from "../components/dialog.mjs";
import api from "../system/api.mjs";
import {goto, state, apiURL, siteTitle, ready, getApiConfig} from "../system/core.mjs"
import { refreshStatus } from "../system/user.mjs";

const elementName = 'login-page'

const template = document.createElement('template');
template.innerHTML = `
    <link rel='stylesheet' href='/css/global.css'>
    <style>
      #container{
        padding: 10px;
      }
      #loginms-btn{
        height: 50px;
        cursor:pointer;
      }
      #loginms-btn:hover{
        box-shadow: 0px 0px 10px gray;
      }
      input{
        margin-bottom: 5px;
      }
      #flex{
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      #flex div{
        padding: 10px;
      }
      #flex > div{
        border: 1px solid gray;
        border-radius: 5px;
        box-shadow: 3px 3px 15px gray;
      }
      #mssignin{display: none;}
    </style>
    <div id="container">

        <h1>Sign in to <span id="sitetitle"></span></h1>

        <div>You can sign in using the provided choice(s) below.</div>
        <br>

        <div id="flex">
          <div id="mssignin">
            <h3>Microsoft:</h3>
            <img src="/img/mssignin.png" id="loginms-btn" alt="Click here to login using a Microsoft account"></img><br/>
          </div>
          <div>
            <h3>Username / password:</h3>
            <form>
              <input id="username" name="username" placeholder="Username"><br>
              <input type="password" name="password" placeholder="Password" id="password">
              <br>
              <button class="styled" id="login-btn">Sign in</button>
            </form>
          </div>
    </div>
`;

class IndexPage extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.login = this.login.bind(this);
    
    this.shadowRoot.querySelector("#loginms-btn").addEventListener("click", () => {
      let redirect = state().query.redirect;
      let url = new URL(window.location)
      url.pathname = redirect || "/"
      url.searchParams.delete("redirect")
      window.location = `${apiURL()}/auth/login?redirect=${encodeURIComponent(url.toString())}`
    })

    this.shadowRoot.querySelector("#login-btn").addEventListener("click", this.login)
    /*
    this.shadowRoot.querySelectorAll("input").forEach(e => e.addEventListener("keydown", e => {
      if(e.keyCode == 13){
        this.login();
      }
    }))
    */

    this.shadowRoot.getElementById("username").value = localStorage.getItem("username") || ""
    this.shadowRoot.querySelector("form").addEventListener("submit", e => e.preventDefault());

    this.shadowRoot.getElementById("sitetitle").innerText = siteTitle()
    ready.then(() => {
      this.shadowRoot.getElementById("sitetitle").innerText = siteTitle()
      this.shadowRoot.getElementById("mssignin").style.display = getApiConfig().msSigninEnabled ? "block" : "none"
    })

    let loginComponents = getApiConfig().mods.map(m => m.files.filter(f => /\/login\-[a-zA-z0-9]+\.mjs/.test(f))).flat();

    for(let path of loginComponents){
      import(path).then(i => {
        let div = document.createElement("div")
        div.innerHTML = `<${i.name}></${i.name}>`
        this.shadowRoot.getElementById("flex").appendChild(div)
      })
    }
  }

  async login(){
    let username = this.shadowRoot.getElementById("username").value;
    let password = this.shadowRoot.getElementById("password").value;
    let response = await api.post("auth/login", {username, password})
    if(response.success == true){
      api.setToken(response.token)
      await refreshStatus()
      let redirect = state().query.redirect || "/"
      goto(redirect)
    } else {
      alertDialog("Wrong username/password combination. If you continue seeing this error and you are sure that the combination is correct, your user might be deactivated")
    }
  }

  connectedCallback() {
    //this.shadowRoot.querySelector('#toggle-info').addEventListener('click', () => this.toggleInfo());
    if(this.shadowRoot.getElementById("username").value)
      this.shadowRoot.getElementById("password").focus()
    else
    this.shadowRoot.getElementById("username").focus()
  }

  disconnectedCallback() {
    //this.shadowRoot.querySelector('#toggle-info').removeEventListener();
  }
}

window.customElements.define(elementName, IndexPage);

export {IndexPage as Element, elementName as name}