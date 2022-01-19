import Permission from "../models/permission.mjs"
import Role from "../models/role.mjs"

export default async () => {
  Permission.lookupOrCreate("admin")
  Role.lookupOrCreate("admin").addPermission("admin")
}