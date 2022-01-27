import modRoutes from "/modroutes.mjs"

let routes = [
    {path: "/login",                  page: "../pages/login.mjs"},
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
    {regexp: /\/setup\/users\/([a-z0-9\_\-]+)/,    page: "../pages/setup/user.mjs"},
    {regexp: /\/setup\/role\/([a-z0-9\_\-]+)/,     page: "../pages/setup/role.mjs"},
]

routes.push(...modRoutes)

export default function route(path) {
    path = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path //Remove trailing slash
    let r = routes.find(r => r.path ? r.path == path : r.regexp ? r.regexp.test(path) : false)
    return r ? r.page : null;
}