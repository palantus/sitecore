export let menu = [
  {
    title: "System",
    role: "admin",
    items: [
      {title: "API keys", path: "/system/apikeys"},
      {title: "Jobs", path: "/setup/jobs"},
      {title: "Logs", path: "/logs"},
      {title: "Tools", path: "/systemtools"},
      {title: "Users", path: "/setup/users"}
    ]
  }
]

export let routes = [
  {path: "/login",                  page: "../pages/login.mjs"},
  {path: "/setup/users",            page: "../pages/setup/users.mjs"},
  {path: "/setup/msusers",          page: "../pages/setup/msusers.mjs"},
  {path: "/setup/jobs",             page: "../pages/setup/jobs.mjs"},
  {path: "/systemtools",            page: "../pages/setup/tools.mjs"},
  {path: "/system/apikeys",         page: "../pages/setup/apikeys.mjs"},
  {path: "/logs",                   page: "../pages/setup/logs.mjs"},
  {regexp: /\/setup\/users\/([a-z]+)/,    page: "../pages/setup/user.mjs"},
]