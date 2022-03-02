import api from "./api.mjs";
import {fire} from "./events.mjs"

export let user = null;

export async function refreshStatus(){
  let newUser
  try{
    newUser = api.hasToken() ? await getUser() : null
  } catch(err){
    newUser = null;
  }
  if(user && user.id != "guest" && (!newUser || newUser.id == "guest"))
    fire("logged-out")
  if(newUser && newUser.id != "guest" && (!user || user?.id != newUser?.id || user.id =="guest"))
    fire("logged-in")
  user = newUser
}

export function isSignedIn(){
  return user?.id && user.id != "guest"
}

export function getUser() { return api.get("me", {cache: true})}

let meRequested = false;
export async function userRoles() {
  let me = user || api.lookupCache("me");
  if(!me && isSignedIn()){
    let storedRoles = window.localStorage.getItem("userroles")
    if(storedRoles) {
      if(!meRequested){
        // Make sure to update cache, in case the roles change
        api.get("me").then(me => {
          let roles = me?.roles || []
          window.localStorage.setItem("userroles", JSON.stringify(roles))
        })
        meRequested = true;
      }
      return JSON.parse(storedRoles)
    }

    me = await api.get("me")
  }
  let roles = me?.roles || []
  window.localStorage.setItem("userroles", JSON.stringify(roles))
  return roles;
}

export async function userPermissions() {
  let me = user || api.lookupCache("me");
  if(!me && isSignedIn()){
    let storedPermissions = window.localStorage.getItem("userpermissions")
    if(storedPermissions) {
      if(!meRequested){
        // Make sure to update cache, in case the permissions change
        api.get("me").then(me => {
          let permissions = me?.permissions || []
          window.localStorage.setItem("userpermissions", JSON.stringify(permissions))
        })
        meRequested = true;
      }
      return JSON.parse(storedPermissions)
    }

    me = await api.get("me")
  }
  let permissions = me?.permissions || []
  window.localStorage.setItem("userpermissions", JSON.stringify(permissions))
  return permissions;
}