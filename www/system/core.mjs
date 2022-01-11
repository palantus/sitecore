import route from "./router.mjs"
import { fire, on } from "./events.mjs"
import config from "/clientconfig.mjs"

class AxmCore {
  async init() {
    this.pages = {}

    let queryArgs = Object.fromEntries(new URLSearchParams(window.location.search).entries())

    this.state = {
      path: window.location.pathname,
      query: queryArgs,
      impersonate: queryArgs.impersonate || null,
      mobile: queryArgs.mobile ? true : false,
      single: queryArgs.single ? true : false
    }

    window.history.replaceState(this.state, null, this.state.path + window.location.search);
    this.render()

    on("changed-page", "core-window-title", () => this.setWindowTitle())
    fire("changed-page", this.state)
    fire("changed-page-not-back", this.state)

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

  async backTo(state) {
    if (state.path == this.state.path) {
      if (JSON.stringify(this.state.query) != JSON.stringify(state.query)) {
        this.state = state
        fire("changed-page-query", this.state.query)
      }
    } else {
      this.state = state
      this.render()
      fire("changed-page", this.state)
    }
  }

  async goto(path, {forceRefresh} = {}) {
    this.state = Object.assign({}, this.state)

    let args = ""

    if (path.indexOf("?") >= 0) {
      args += path.split("?")[1]
    }
    this.state.query = Object.fromEntries(new URLSearchParams(args).entries())

    this.state.path = path.indexOf("?") >= 0 ? path.split("?")[0] : path

    this.pushCurState()
    await this.render(forceRefresh)
    fire("changed-page", this.state)
    fire("changed-page-not-back", this.state)
  }

  setWindowTitle() {
    window.document.title = !this.state.path.slice(1) ? config.title : `${config.title}: ${this.state.path.substr(1).charAt(0).toUpperCase() + this.state.path.substr(2).replace("/", " ")}`
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
      if(replace) window.history.replaceState(this.state, null, `${this.state.path}?${q}`);
      else window.history.pushState(this.state, null, `${this.state.path}?${q}`);
    } else {
      if(replace) window.history.replaceState(this.state, null, this.state.path);
      else window.history.pushState(this.state, null, this.state.path);
    }

    fire("state-changed", this.state)
  }

  async render(forceRefresh) {
    while(this.renderPromise)
      await this.renderPromise;

    let resolve;
    this.renderPromise = new Promise(r => resolve = r)

    let newPage = null;
    let path = this.state.path;

    if (this.pages[path] && !forceRefresh) {
      newPage = this.pages[path]
    } else {
      let pagePath = route(path)
      let elementName = pagePath ? (await import(pagePath)).name : (await import("../pages/404.mjs")).name
      newPage = document.createElement(elementName)
      
      if(this.pages[path]){
        this.pages[path].remove();
      }
    }

    document.querySelector("#main").innerHTML = ''
    document.querySelector("#main").append(newPage)

    this.pages[path] = newPage

    this.renderPromise = null;
    resolve();
  }

  isMobile() {
    let check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
  };
}

let axm = new AxmCore();
axm.init();

export function goto(path, args) { axm.goto(path, args) }
export function pushStateQuery(...args) { axm.pushStateQuery(...args) }
export function removeQueryVar(...args) { axm.removeQueryVar(...args) }
export function state() { return axm.state }
export function isMobile() { return axm.isMobile() }
export function isSecure() { return config.secure }
export function apiURL() { return config.api }
export function wsURL() { return config.ws }
export function siteURL() { return config.site }
export let siteTitle = config.title
export let menu = config.menu
export let mods = config.mods
export function isSinglePageMode() { return state().query.single ? true : false }
export { axm }