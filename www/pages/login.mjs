import { alertDialog, showDialog } from "../components/dialog.mjs";
import api from "../system/api.mjs";
import {goto, state, apiURL, siteTitle, ready, getApiConfig, mods} from "../system/core.mjs"
import { refreshStatus } from "../system/user.mjs";
import Toast from "/components/toast.mjs"

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
      /*
      #flex > div{
        border: 1px solid gray;
        border-radius: 5px;
        box-shadow: 3px 3px 15px gray;
      }
      */
      #flex > div > h3{text-decoration: underline;}
      #mssignin{display: none;}
      #userpass input{
        width: 220px;
      }
      .hidden{display: none;}
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
          <div id="userpass">
            <h3>Username / password:</h3>
            <form>
              <input id="username" name="username" placeholder="Username"><br>
              <input type="password" name="password" placeholder="Password" id="password">
              <br>
              <button class="styled" id="login-btn">Sign in</button>
              <button class="styled" id="reset-pw-btn">Reset password</button>
            </form>
          </div>
    </div>

    <dialog-component title="Reset password" id="reset-dialog">
      <div>
        Please enter your user id and your full name. These must match for the reset to work. 
      </div>
      <br>
      <field-component label="User id"><input id="reset-id"></input></field-component>
      <field-component label="Full name"><input id="reset-name"></input></field-component>
      <br>
      <div>
        This will result in a link being sent to you by e-mail. This link can be used to reset the password.<br>
        If you have any problems resetting a password, please contact the administrator/support. <br>
        Note that after a reset, there is a time period where you can't reset the password again yourself (to avoid spam).
      </div>
    </dialog-component>
`;

class IndexPage extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.login = this.login.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    
    this.shadowRoot.querySelector("#loginms-btn").addEventListener("click", () => {
      let redirect = state().query.redirect;
      let url = new URL(window.location)
      url.pathname = redirect || "/"
      url.searchParams.delete("redirect")
      window.location = `${apiURL()}/auth/login?redirect=${encodeURIComponent(url.toString())}`
    })

    this.shadowRoot.getElementById("login-btn").addEventListener("click", this.login)
    this.shadowRoot.getElementById("reset-pw-btn").addEventListener("click", this.resetPassword)
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

    this.shadowRoot.getElementById("reset-pw-btn").classList.toggle("hidden", !mods().find(({id}) => id == "mail"))
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

  async resetPassword(){
    let dialog = this.shadowRoot.getElementById("reset-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.getElementById("reset-id").focus(),
      ok: async (val) => {
        await api.post(`user/${val.id}/reset-password-mail`, val)
        new Toast({text: "Success! You should receive a new mail in a few moments with a link"})
      },
      validate: (val) => 
          !val.id ? "Please fill out id"
        : !val.name ? "Please fill out name"
        : true,
      values: () => {return {
        id: this.shadowRoot.getElementById("reset-id").value,
        name: this.shadowRoot.getElementById("reset-name").value,
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
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