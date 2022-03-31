import { apiURL } from "./core.mjs"

let routes = [
    {path: "/login",                  page: "../pages/login.mjs", publicAccess: true},
    {path: "/",                       page: "../pages/index.mjs", publicAccess: true},
    {path: "/default-home",           page: "../pages/index-default.mjs", publicAccess: true},
    {path: "/setup/users",            page: "../pages/setup/users.mjs"},
    {path: "/setup/msusers",          page: "../pages/setup/msusers.mjs"},
    {path: "/setup/roles",            page: "../pages/setup/roles.mjs"},
    {path: "/setup/mods",             page: "../pages/setup/mods.mjs"},
    {path: "/setup",                  page: "../pages/setup/setup.mjs"},
    {path: "/setup/jobs",             page: "../pages/setup/jobs.mjs"},
    {path: "/systemtools",            page: "../pages/setup/tools.mjs"},
    {path: "/system/db",              page: "../pages/setup/db.mjs"},
    {path: "/system/apikeys",         page: "../pages/setup/apikeys.mjs"},
    {path: "/logs",                   page: "../pages/setup/logs.mjs"},
    {path: "/profile",                page: "../pages/setup/profile.mjs"},
    {regexp: /^\/setup\/users\/([a-zA-Z0-9\-_@&.]+)/,    page: "../pages/setup/user.mjs"},
    {regexp: /^\/setup\/role\/([a-z0-9\_\-]+)/,     page: "../pages/setup/role.mjs"},
]

export async function init(){
  let {default: modRoutes} = await import(`${apiURL()}/modroutes.mjs`)
  routes.unshift(...modRoutes)
}

export default function lookupRoute(path) {
    path = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path //Remove trailing slash
    let r = routes.find(r => r.path ? r.path == path : r.regexp ? r.regexp.test(path) : false)
    return r || null;
}