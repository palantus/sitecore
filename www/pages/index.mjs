const elementName = 'index-core-me-page'
import {getUser, isSignedIn} from "../system/user.mjs"
import {goto, getApiConfig} from "../system/core.mjs"

class IndexPage extends HTMLElement {
  connectedCallback() {
    getUser().then(me => {
      if(isSignedIn() && me.setup.home)
        goto(me.setup.home, {replace: true})
      else if(isSignedIn() && getApiConfig().homeInternal)
        goto(getApiConfig().homeInternal, {replace: true})
      else if(!isSignedIn() && getApiConfig().homePublic)
        goto(getApiConfig().homePublic, {replace: true})
      else
        goto("/default-home", {replace: true})
    }).catch(err => {
      if(getApiConfig().homePublic)
        goto(getApiConfig().homePublic, {replace: true})
      else
        goto("/default-home", {replace: true})
    })
  }
}

window.customElements.define(elementName, IndexPage);

export {IndexPage as Element, elementName as name}