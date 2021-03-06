export let menu = [
  {
    title: "Me",
    public: true,
    hideWhenSignedIn: true,
    items: [
      {title: "Sign in", path: "/login", public: true}
    ]
  },
  {
    title: "System",
    permission: "admin",
    items: [
      {title: "API keys", path: "/system/apikeys"},
      {title: "Federation", path: "/setup/federation"},
      {title: "Jobs", path: "/setup/jobs"},
      {title: "Logs", path: "/logs"},
      {title: "Mods", path: "/setup/mods"},
      {title: "Setup", path: "/setup"},
      {title: "Tools", path: "/systemtools"},
      {title: "Users", path: "/setup/users"}
    ]
  }
]