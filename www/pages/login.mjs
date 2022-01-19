import { alertDialog } from "../components/dialog.mjs";
import api from "../system/api.mjs";
import {goto, state, apiURL} from "../system/core.mjs"

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
        
      }
      #flex div{
        padding: 10px;
      }
      #flex > div{
        float: left;
      }
    </style>
    <div id="container">

        <h1>Welcome to SiteCore!</h1>

        <div>You are not signed in. You can sign in using an authorized Microsoft account or with username/password.</div>
        <br>

        <div id="flex">
          <div>
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
      url.pathname = redirect
      url.searchParams.delete("redirect")
      window.location = `${apiURL()}/auth/login?redirect=${encodeURIComponent(url.toString())}`
    })

    this.shadowRoot.querySelector("#login-btn").addEventListener("click", this.login)
    this.shadowRoot.querySelectorAll("input").forEach(e => e.addEventListener("keydown", e => {
      if(e.keyCode == 13){
        this.login();
      }
    }))

    this.shadowRoot.getElementById("username").value = localStorage.getItem("username") || ""
    this.shadowRoot.querySelector("form").addEventListener("submit", e => e.preventDefault());
  }

  async login(){
    let username = this.shadowRoot.getElementById("username").value;
    let password = this.shadowRoot.getElementById("password").value;
    let response = await api.post("auth/login", {username, password})
    if(response.success == true){
      localStorage.setItem("username", username)
      let redirect = state().query.redirect;
      if(redirect){
        let path = redirect.endsWith("/") ? redirect.slice(0, -1) : redirect
        let url = new URL(window.location)
        url.pathname = path
        url.searchParams.set("token", response.token)
        url.searchParams.delete("redirect")
        window.location = url
      } else {
        goto(`/?token=${response.token}`)
      }
    } else {
      alertDialog("Wrong username/password combination. If you continue seeing this error and you are sure that the combination is correct, your user might be deactivated")
    }
  }

  connectedCallback() {
    //this.shadowRoot.querySelector('#toggle-info').addEventListener('click', () => this.toggleInfo());
    this.shadowRoot.querySelector("input").focus()
  }

  disconnectedCallback() {
    //this.shadowRoot.querySelector('#toggle-info').removeEventListener();
  }
}

window.customElements.define(elementName, IndexPage);

export {IndexPage as Element, elementName as name}