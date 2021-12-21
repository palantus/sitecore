"use strict"

import Entity from "entitystorage"

class MSUser extends Entity{
    initNew(id, {email = "", name = ""} = {}){
        if(!email){
            throw "email is required to create a MSUser"
        }

        if(MSUser.lookup(email)){
            console.log(`Attempted to create already existing msuser: ${email}`)
            return MSUser.lookup(email);
        }

        this.id = id;
        this.email = email;
        this.name = typeof name === "string" && name.length > 0 ? name : "";
        this.tag("msuser")
    }

    static lookup(email){
        return MSUser.find(`tag:msuser (prop:"id=${email}"|prop:"email=${email}")`)
    }

    toObj(){
        return {
            id: this.id,
            email: this.email,
            name: this.name
        }
    }
}

export default MSUser