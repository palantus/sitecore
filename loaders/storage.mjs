import dotenv from 'dotenv'
dotenv.config()

import Entity from "entitystorage"
import {unlinkSync} from 'fs'

export default async () => {
    if(process.env.DEL_DATA_ON_STARTUP === "true"){
        console.log("Deleting current database")
        try{unlinkSync("storage/props.data")}catch(err){}
        try{unlinkSync("storage/rels.data")}catch(err){}
        try{unlinkSync("storage/tags.data")}catch(err){}
    }

    /*
    let args from "yargs").argv
    console.log(args)
    let db = args.db || process.env.db || "storage"

    console.log("Using database: " + db)

    await Entity.init(db)
    */
}   