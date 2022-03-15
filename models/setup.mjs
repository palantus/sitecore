import Entity, {query} from "entitystorage"

export default class Setup extends Entity {
  initNew() {
    this.tag("setupcore")
  }

  static lookup() {
    return query.type(Setup).tag("setupcore").first || new Setup()
  }

  toObj(){
    return {
      siteTitle: this.siteTitle,
      homePublic: this.homePublic,
      homeInternal: this.homeInternal,
      msSigninClientId: this.msSigninClientId,
      msSigninSecretSet: !!this.msSigninSecret
    }
  }
}