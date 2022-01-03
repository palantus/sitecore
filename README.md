# Site core

## Setup using .env:

- SITE_TITLE: Title of the site
- ADMIN_PASS: Password for user admin
- PORT: port to listen on
- PORT_API: port for API-mode (only useful if you have projects supporting multiple modes)
- PORT_WWW: port for www-mode (only useful if you have projects supporting multiple modes)
- PORT_COMBINED: port for combined-mode (only useful if you have projects supporting multiple modes)

## Run using one of the following "main-files":

- server-api.mjs: Only expose an api from this server/instance
- server-www.mjs: Only expose the client files from this server/instance
- server.mjs: expose both the api (standard prefix /api, can be overridden using API_PREFIX) and the client files

## Initial setup:

- Set ADMIN_PASS in .env to a new admin password
- start server and login using admin as username


## Main menu:
Can be overridden by creating a menu.mjs in root folder of sitecore or a mod, which has a default export of type array. Otherwise, the menu consists of a merge of all ui.mjs files in sitecore and mod root folders.

## Mods
Take a look at the mod sample in mods folder. It can be loaded by placing LOAD_SAMPLE=TRUE in .env.

### Client files (js, css etc.)
It is important to note that the www folder in a mod is exposed on the root of the site, meaning that the mod can overrule ANY public file from core, if it needs to. That is a great power, but consider using namespacing (subfolders) for mod files, to avoid accidental name clashes.

### Extending command palette (F1)
Take a look at my mod sitemod-wiki or sitemod-files. Basically you need to plads a javascript file in www/commands/ which exports the commands.