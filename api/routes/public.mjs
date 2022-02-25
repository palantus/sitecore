import DataType from "../../models/datatype.mjs";
import Permission from "../../models/permission.mjs";
import Role from "../../models/role.mjs";
import { sanitize } from "entitystorage";

export default (app) => {


  app.get('/system/datatypes', function (req, res, next) {
    res.json(DataType.all().map(dt => dt.toObj()));
  });

  app.get('/system/datatypes/:id', function (req, res, next) {
    let type = DataType.lookup(sanitize(req.params.id))
    if(!type) return res.status(401).json("Datatype doesn't exist");
    res.json(type.toObj());
  });

  app.get("/role/:id", (req, res) => {
    let role = Role.lookup(sanitize(req.params.id))
    if(!role) throw "Unknown role"
    res.json({id: role.id, permissions: role.rels.permission?.map(p => p.id)||[]});
  })

  app.get("/role", (req, res) => {
    res.json(Role.all().map(({id}) => ({id})));
  })

  app.get("/permission", (req, res) => {
    res.json(Permission.all().map(({id}) => ({id})));
  })
}