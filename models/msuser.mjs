"use strict"

import Entity, {query} from "entitystorage"

class MSUser extends Entity {
  initNew(id, { email = "", name = "" } = {}) {
    if (!email) {
      throw "email is required to create a MSUser"
    }

    if (MSUser.lookup(email)) {
      console.log(`Attempted to create already existing msuser: ${email}`)
      return MSUser.lookup(email);
    }

    this.id = id;
    this.email = email;
    this.name = typeof name === "string" && name.length > 0 ? name : "";
    this.tag("msuser")
  }

  static lookup(email) {
    return query.type(MSUser)
                .tag("msuser")
                .and(
                  query.prop("id", email)
                       .or(query.prop("email", email))).first
  }

  static all(){
    return query.tag("msuser").type(MSUser).all
  }

  toObj() {
    return {
      id: this.id,
      email: this.email,
      name: this.name
    }
  }
}

export default MSUser