import DataType from "../models/datatype.mjs";
import Role from "../models/role.mjs"
import User from "../models/user.mjs"

export default async () => {
  Role.lookupOrCreate("admin").addPermission(["admin", "user.read", "user.edit", "user.impersonate"], true);
  
  let admin = User.lookup("admin");
  if(!admin){
    admin = new User("admin", {name: "Admin"})
    console.log("Created initial admin user 'admin'");

    if(!process.env.ADMIN_PASS){
      console.log("Setting admin password to 'admin'. Please change password!")
      admin.setPassword("admin")
    }
  }
  if(process.env.ADMIN_PASS) {
    admin.setPassword(process.env.ADMIN_PASS)
  }
  admin.addRole("admin")

  let guest = User.lookup("guest");
  if(!guest){
    guest = new User("guest", {name: "Guest"})
    console.log("Created 'guest' user");
  }  
  
  DataType.lookupOrCreate("user", {title: "User", permission: "user.read", nameField: "name", uiPath: "setup/users"})
  DataType.lookupOrCreate("type", {title: "Type", nameField: "title", api: "system/datatypes"})
  DataType.lookupOrCreate("role", {title: "Role", nameField: "id", api: "role", uiPath: "setup/role"})
  DataType.lookupOrCreate("permission", {title: "Permission", nameField: "id", api: "permission"})
}