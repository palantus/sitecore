
export default ({mode}) => {
  let setup = {}

  setup.siteHost = process.env.SITE_HOST || (mode == "combined" ? process.env.API_HOST : null)
  setup.apiHost = mode == "combined" ? setup.siteHost : process.env.API_HOST || setup.siteHost
  setup.isSecure = !!(process.env.SECURE == "TRUE" || process.env.SECURE == "true")

  if(!setup.apiHost || !setup.siteHost)
    throw "Missing SITE_HOST or API_HOST. Set in .env or as environment variable"

  setup.serverMode = mode
  setup.siteURL = `http${setup.isSecure?'s':''}://${setup.siteHost}`
  setup.apiPrefix = mode == "combined" ? "api" : ""
  setup.apiURL = `http${setup.isSecure?'s':''}://${setup.apiHost}${setup.apiPrefix?`/${setup.apiPrefix}` : ''}`
  setup.wsURL = `ws${setup.isSecure?'s':''}://${setup.apiHost}`
  setup.cookieDomain = process.env.COOKIEDOMAIN || apiHost

  global.sitecore = setup

  console.log(global.sitecore)
}