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
Can be overridden by creating a menu.mjs in root folder which has a default export of type array