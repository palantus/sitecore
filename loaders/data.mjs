import Permission from "../models/permission.mjs"
import Role from "../models/role.mjs"

export default async () => {
  Role.lookupOrCreate("admin").addPermission(["admin", "user.read", "user.edit", "user.impersonate"], true)
}