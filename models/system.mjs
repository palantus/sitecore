"use strict"

import Entity from "entitystorage"

class System extends Entity{
    initNew(){
        this.tag("system")
    }

    static lookup(){
        return System.findOrCreate(`tag:system`)
    }

    get flags(){
        return Entity.find("tag:systemFlags") || new Entity().tag("systemFlags")
        
    }
}

export default System