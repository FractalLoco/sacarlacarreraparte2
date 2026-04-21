"use strict";
const router = require("express").Router();
const c      = require("../controllers/haccp.controller");
const {autenticar,nivelSupervisor} = require("../middleware/auth");
const audit  = require("../middleware/audit");

router.get("/",              autenticar, c.listar);
router.get("/:id",           autenticar, c.obtener);
router.get("/:id/imprimir",  autenticar, c.imprimir);
router.post("/",             autenticar, audit("crear_haccp"),      c.crear);
router.put("/:id",           autenticar, audit("editar_haccp"),     c.actualizar);
router.delete("/:id",        autenticar, nivelSupervisor, audit("eliminar_haccp"), c.eliminar);
module.exports = router;
