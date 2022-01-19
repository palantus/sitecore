import Role from "../models/role.mjs"

export default async () => {
  Role.lookupOrCreate("admin")
}