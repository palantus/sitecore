import Entity from "entitystorage"

export default class Setup extends Entity {
  initNew() {
    this.tag("setupcore")
  }

  static lookup() {
    return Setup.findOrCreate(`tag:setupcore`)
  }

  toObj(){
    return {
      siteTitle: this.siteTitle
    }
  }
}