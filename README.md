# Site core

## Setup using .env:

- ACCESS_TOKEN_SECRET: A secret string of characters used to encrypt JWT and user passwords. To make your sign-ins compatible with other apps, use the same secret on those as well.
- PORT: port to listen on
- PORT_API: port for API-mode (only useful if you have projects supporting multiple modes)
- PORT_WWW: port for www-mode (only useful if you have projects supporting multiple modes)
- PORT_COMBINED: port for combined-mode (only useful if you have projects supporting multiple modes)
- ADMIN_MODE: Last resort, if you can't log in. By setting this to TRUE, you every request is seen as admin.
- SECURE: set to TRUE if you are on a secure connection
- SITE_HOST: domain for the site (including port, if non-default) - eg.: example.com or localhost:8080
- API_HOST: (optional) domain for the API (including port, if non-default) - eg.: api.example.com or localhost:8080
- COOKIEDOMAIN: Domain to set cookies on (eg. ".example.com" or "localhost"). Don't include port.
- STORAGE: relative path to database and blob storage. Will be created if it doesn't exist. Default is "storage".

## Run using one of the following "main-files":

- server-api.mjs: Only expose an api from this server/instance
- server-www.mjs: Only expose the client files from this server/instance
- server.mjs: expose both the api (standard prefix /api, can be overridden using API_PREFIX) and the client files

## Initial setup:

- Set ADMIN_PASS in .env to a new admin password (otherwise password is "admin")
- start server and login using admin as username


## Main menu:
Can be overridden by creating a menu.mjs in root folder of sitecore or a mod, which has a default export of type array. Otherwise, the menu consists of a merge of all ui.mjs files in sitecore and mod root folders.

### Permissions

Any menu or item in the menu, can have roles (array) or public (boolean) defined, to control which items are available to a given user.

## Mods
Take a look at the mod sample in mods folder. It is loaded by default, but can be disabled under System/Mods in the UI.

### Client files (js, css etc.)
It is important to note that the www folder in a mod is exposed on the root of the site, meaning that the mod can overrule ANY public file from core, if it needs to. That is a great power, but consider using namespacing (subfolders) for mod files, to avoid accidental name clashes.

### Extending command palette (F1)
Take a look at my mod sitemod-wiki or sitemod-files. Basically you need to plads a javascript file in www/commands/ which exports the commands.

### Add custom authentication

You can add a auth.mjs file to the api folder in your mod. This will be added to the express chain first, meaning that you can use it to set eg. res.locals.user and thereby authenticate a user by some custom means.

### Add setup page,

Add a route for `/<modid>/setup` (eg. `/sample/setup`) in `routes.mjs`. If this route exists, the mod is clickable in the mods overview page. Clicking it will redirect to the setup page.