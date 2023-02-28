import Entity, {query} from "entitystorage"
import { clearCache, reloadMSLogin } from "../services/mslogin.mjs"

export default class Setup extends Entity {
  initNew() {
    this.tag("setupcore")
  }

  static lookup() {
    return query.type(Setup).tag("setupcore").first || new Setup()
  }

  patch(obj) {
    if(typeof obj.siteTitle === "string") this.siteTitle = obj.siteTitle
    if(typeof obj.homePublic === "string") this.homePublic = obj.homePublic
    if(typeof obj.homeInternal === "string") this.homeInternal = obj.homeInternal
    if(typeof obj.msSigninClientId === "string") this.msSigninClientId = obj.msSigninClientId
    if(typeof obj.msSigninSecret === "string") this.msSigninSecret = obj.msSigninSecret
    if(typeof obj.msSigninTenant === "string") this.msSigninTenant = obj.msSigninTenant

    if(obj.msSigninClientId || obj.msSigninSecretSet || obj.msSigninTenant){
      clearCache();
      reloadMSLogin();
    }
  }

  toObj(){
    return {
      siteTitle: this.siteTitle||null,
      homePublic: this.homePublic||null,
      homeInternal: this.homeInternal||null,
      msSigninClientId: this.msSigninClientId||null,
      msSigninSecretSet: !!this.msSigninSecret||null,
      msSigninTenant: this.msSigninTenant||null
    }
  }
}