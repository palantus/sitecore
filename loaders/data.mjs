import Permission from "../models/permission.mjs"
import Role from "../models/role.mjs"
import User from "../models/user.mjs"

export default async () => {
  Role.lookupOrCreate("admin").addPermission(["admin", "user.read", "user.edit", "user.impersonate"], true);
  
  let admin = User.lookup("admin");
  if(!admin){
    admin = new User("admin", {name: "Admin"})
    console.log("Created initial admin user 'admin'");

    admin.setPassword(process.env.ADMIN_PASS || "admin")
    if(!process.env.ADMIN_PASS)
      console.log("Setting admin password to 'admin'. Please change password!")
  }
  admin.addRole("admin")
}