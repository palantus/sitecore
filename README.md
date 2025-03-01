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
- CACHE: true/false indicating if static files should be cached in memory. Default `true`. Use `true` for prodoction and `false` for development.

## Run mode

- api: Only expose an api from this server/instance
- www: Only expose the static client files from this server/instance
- combined: expose both the api (standard prefix /api, can be overridden using API_PREFIX) and the client files

Default is combined. It can be changed by setting `MODE` in .env or passing `mode` as parameter

## Initial setup:

- Set ADMIN_PASS in .env to a new admin password (otherwise password is "admin")
- start server and login using admin as username

## Run in Docker

- Expose port 8080.
- Set the following env variables:
  - `SITE_HOST`: The hostname (including port, if not 80/443) that users can reach the site at
  - `SECURE`: Set to `FALSE` if the connection isn't encrypted (ie. not https).
  - `ACCESS_TOKEN_SECRET`: Set to a long, random string of characters. Make sure to not lose this, as it is used to encrypt/decrypt values like passwords. 
- Optionally map the following locations for persistance:
  - `/home/node/app/mods`: mods installed through GUI.
  - `/home/node/app/storage`: database, uploaded files etc.


## Main menu:
Can be overridden by creating a menu.mjs in root folder of sitecore or a mod, which has a default export of type array. Otherwise, the menu consists of a merge of all ui.mjs files in sitecore and mod root folders.

For a given item/menu, you can set the following properties:
- `role`: Role that the user must have (eg. `admin`)
- `permission`: Permission that the user must have (eg. `user.read`)
- `public`: If set to `true`, the item is shown, even though the user isn't signed in
- `hideWhenSignedIn`: If set to `true`, the item is hidden when the user is signed in (useful for eg. welcome pages or login pages)

Note that for public pages, the route must be set to `public: true` as well. Otherwise, the user will be redirected to the login page.

### Permissions

Any menu, or item in the menu, can have `roles` (array), `permissions` (array) or `public` (boolean) defined, to control which items are available to a given user.

## Mods
Take a look at the mod sample in mods folder. It is loaded by default, but can be disabled under System/Mods in the UI. For more advanced samples, check out `sitemod-files`, `sitemod-wiki`, `sitemod-lists` or `sitemod-passec` in my repositories.

Installing, updating and uninstalling mods is possible in the GUI.

### Client files (js, css etc.)
It is important to note that the www folder in a mod is exposed on the root of the site, meaning that the mod can overrule ANY public file from core, if it needs to. That is a great power, but consider using namespacing (subfolders) for mod files, to avoid accidental name clashes.

If you want to use the api/mods part of SiteCore, but not the UI, just replace index.html in a mod!

### Extending command palette (F1)
Take a look at my mod sitemod-wiki or sitemod-files. Basically you need to place a javascript file in `www/commands/` which exports the commands.

### Add custom authentication

You can add a auth.mjs file to the api folder in your mod. This will be added to the express chain first, meaning that you can use it to set eg. res.locals.user and thereby authenticate a user by some custom means.

### Add setup page,

Add a route for `/<modid>/setup` (eg. `/sample/setup`) in `routes.mjs`. If this route exists, the mod is clickable in the mods overview page. Clicking it will redirect to the setup page.

### Add custom sign in method

Create a component in a file called `login-XXXX.mjs` in your mod and it will be shown on the login page. Note that it must export a property called `name` which contains the custom element name that should be used.

### Add components to user profile page

Create a component in a file called `user-profile-XXXX.mjs` in your mod and it will be shown on the user profile page. Note that it must export a property called `name` which contains the custom element name that should be used.

### Add icon to the top-right of the page

Create a component in a file called `topbar-XXXX.mjs` in your mod and it will be shown to the left of notifications. Set the attribute `page` to a component to show in the rightbar (similar to user and notifications). The value should exist as a component at path `/pages/rightbar/<page>.mjs`. Note that it must export a property called `name` which contains the custom element name that should be used.

### Add content to core pages

- User page (page viewed by admins): subscribe to event `user-page-created`. When fired, you will get an object with `{page, container, userId}`
- Profile page (page viewed by the current user): subscribe to event `user-profile-page-created`. When fired, you will get an object with `{page, container}`

### Data types

Using datatypes, any custom types that a mod introduces, can be used to create things like custom lookups etc. that work across types. Take a look in services.mjs in eg. `sitemod-files` for a sample of how to define a new datatype.

### Defining dependencies

Add a section to the mod's package.json:

```json
"sitecore": {
  "dependencies": [
    "files",
    "wiki
  ]
}
```
