import Permission from "../models/permission.mjs"
import Role from "../models/role.mjs"

export default async () => {
  Permission.lookupOrCreate("admin")
  Permission.lookupOrCreate("user.read")
  Permission.lookupOrCreate("user.edit")
  Role.lookupOrCreate("admin").addPermission("admin")
}