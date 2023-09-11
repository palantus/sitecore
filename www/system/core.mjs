import lookupRoute, { init as initRouter } from "./router.mjs"
import { fire, on } from "./events.mjs"
import { isSignedIn, refreshStatus } from "./user.mjs";
let config;
let apiConfig;
let readyResolve = null;
let remoteId = null;
export let ready = new Promise(r => {readyResolve = r})

class SiteCore {
  async init() {
    this.pages = {}

    let queryArgs = Object.fromEntries(new URLSearchParams(window.location.search).entries())

    remoteId = window.location.pathname.startsWith("/_") ? window.location.pathname.split("/")[1].substring(1) : null

    this.state = {
      path: remoteId ? "/" + window.location.pathname.split("/").slice(2).join("/") : window.location.pathname,
      query: queryArgs,
      impersonate: queryArgs.impersonate || null,
      mobile: queryArgs.mobile ? true : false,
      single: queryArgs.single ? true : false
    }

    this.setWindowTitle();

    config = await (await fetch(`/wwwconfig`)).json(); // Fetch config from site (static resources/frontend)

    if(window.location.pathname.startsWith("/_")){
      config.api = `${config.api}/federation/${remoteId}/api`;
      config.site = `${config.site}/_${remoteId}`;
    }

    apiConfig = await (await fetch(`${config.api}/clientconfig`)).json(); // Fetch config from API server
    window.localStorage.setItem("SiteTitle", apiConfig.title)

    await Promise.all([refreshStatus(), initRouter(), this.loadMods()])
    readyResolve();

    window.history.replaceState(this.state, null, (remoteId ? `/_${remoteId}${this.state.path}` : this.state.path) + window.location.search);

    this.render().then(successful => {
      if(!successful) return;
      fire("changed-page-not-back", this.state)
    })

    window.onpopstate = (event) => {
      if (event.state) {
        this.backTo(event.state)
      }
    };

    //document.querySelector("#btn1").addEventListener("click", () => this.goto("issues"))
    //document.querySelector("#btn2").addEventListener("click", () => this.goto("instances"))

    if ((this.isMobile() || this.state.query.mobile) && !this.state.query.single) {
      document.getElementById("grid-container").classList.add("collapsed")
      document.getElementById("grid-container").classList.add("mobile")
      on("changed-page", "core-mobile", () => {
        document.getElementById("grid-container").classList.add("collapsed")
        document.getElementById("grid-container").classList.remove("rightvisible")
      })
    }
  }

  async loadMods(){
    let modPromises = []
    for(let mod of getApiConfig().mods){
      let path = `/load-mod-${mod.id}.mjs`
      if(!mod.files.includes(path)) continue;
      modPromises.push(import(path))
    }
    let importedMods = await Promise.all(modPromises)
    for(let imported of importedMods){
      if(typeof imported.load !== "function") return;
      imported.load()
    }
  }

  async backTo(state) {
    if (state.path == this.state.path) {
      if (JSON.stringify(this.state.query) != JSON.stringify(state.query)) {
        this.state = state
        fire("changed-page-query", this.state.query)
      }
    } else {
      this.state = state
      await this.render()
    }
  }

  async goto(path, {forceRefresh, replace = false} = {}) {
    this.state = Object.assign({}, this.state)

    let args = ""

    if (path.indexOf("?") >= 0) {
      args += path.split("?")[1]
    }
    this.state.query = Object.fromEntries(new URLSearchParams(args).entries())

    this.state.path = path.indexOf("?") >= 0 ? path.split("?")[0] : path
    this.state.title = this.state.path.substr(1).charAt(0).toUpperCase() + this.state.path.substr(2).replace("/", " ")

    this.pushCurState({replace})
    if(await this.render(forceRefresh)){
      fire("changed-page-not-back", this.state)
    }
  }

  setWindowTitle() {
    window.document.title = !this.state.path.slice(1) ? siteTitle() : `${siteTitle()}: ${this.state.title || this.state.path.substr(1).charAt(0).toUpperCase() + this.state.path.substr(2).replaceAll("/", " ")}`
  }

  async pushStateQuery(query = {}, extendCurrent = false) {
    let newQuery = extendCurrent ? Object.assign(Object.assign({}, this.state.query), query) : query

    if (JSON.stringify(this.state.query) == JSON.stringify(newQuery))
      return;

    this.state = JSON.parse(JSON.stringify(this.state))
    this.state.query = newQuery;

    this.pushCurState()
    fire("changed-page-query", this.state.query)
  }

  removeQueryVar(varName){
    delete this.state.query[varName];
    this.pushCurState({replace: true})
  }

  async pushCurState({replace = false} = {}) {

    let query = Object.assign({}, this.state.query)

    if (this.state.impersonate) query.impersonate = this.state.impersonate;
    if (this.state.single) query.single = this.state.single;
    if (this.state.mobile) query.mobile = this.state.mobile;

    if (Object.entries(query).length > 0) {
      let q = Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
      if(replace) window.history.replaceState(this.state, null, `${this.getBrowserUrl()}?${q}`);
      else window.history.pushState(this.state, null, `${this.getBrowserUrl()}?${q}`);
    } else {
      if(replace) window.history.replaceState(this.state, null, this.getBrowserUrl());
      else window.history.pushState(this.state, null, this.getBrowserUrl());
    }

    fire("state-changed", this.state)
  }

  getBrowserUrl(){
    return window.location.pathname.startsWith("/_") ? `/_${window.location.pathname.split("/")[1].substring(1)}${this.state.path}` : this.state.path
  }

  async render(forceRefresh) {
    while(this.renderPromise)
      await this.renderPromise;
      
    await refreshStatus()

    let resolve;
    this.renderPromise = new Promise(r => resolve = r)

    let newPage = null;
    let path = this.state.path;
    let showingCachedPage = false;

    if (this.pages[path] && !forceRefresh) {
      newPage = this.pages[path]
      showingCachedPage = true
    } else {
      let route = lookupRoute(path)
      let elementName;
      if(!route)
        elementName = (await import("../pages/404.mjs")).name
      else if(path == "/login" || route.publicAccess === true || isSignedIn())
        elementName = (await import(route.page)).name
      else {
        this.renderPromise = null;
        resolve()
        this.login()
        return false;
      }
      newPage = document.createElement(elementName)
      
      if(this.pages[path]){
        this.pages[path].remove();
      }
    }

    document.getElementById("main").innerHTML = ''
    document.getElementById("main").append(newPage)

    this.pages[path] = newPage

    this.renderPromise = null;

    fire("changed-page", this.state)
    if(showingCachedPage){
      fire("returned-to-page", this.state)
    } else {
      fire("first-page-load", this.state)
    }
    this.setWindowTitle()
    resolve();
    return true;
  }

  isMobile() {
    let check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
  };

  login() {
    if (window.location.pathname.startsWith("/login")) return;
    let redirectUrl = window.location.pathname;
    goto(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
  }
}

let sc = new SiteCore();
sc.init();

export function goto(path, args) { sc.goto(path, args) }
export function pushStateQuery(...args) { sc.pushStateQuery(...args) }
export function removeQueryVar(...args) { sc.removeQueryVar(...args) }
export function saveState(){sc.pushCurState({replace: true})}
export function state() { return sc.state }
export function isMobile() { return sc.isMobile() }
export function isSecure() { return config.secure }
export function apiURL() { return config.api }
export function wsURL() { return config.ws }
export function siteURL() { return config.site }
export function isSinglePageMode() { return state().query.single ? true : false }
export function siteTitle(){return apiConfig?.title || window.localStorage.getItem("SiteTitle") || "SiteCore"}
export function mods(){return apiConfig.mods}
export function menu(){return apiConfig.menu}
export function getApiConfig(){return apiConfig}
export function setPageTitle(title){sc.state.title = title; sc.setWindowTitle()}
export function pageElement(){return sc.pages[sc.state.path]}
export function getRemoteId(){return remoteId} // Id for a remote (federation) to use for site and API. Used for subs in particular.
export { sc }
