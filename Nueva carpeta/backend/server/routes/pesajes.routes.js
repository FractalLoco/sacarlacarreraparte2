"use strict";
const router=require("express").Router();
const c=require("../controllers/pesajes.controller");
const {autenticar,nivelSupervisor,nivelJefe}=require("../middleware/auth");
const audit=require("../middleware/audit");
// Rutas fijas ANTES de /:id
router.get("/tipos",    autenticar, c.tipos);
router.get("/calibres", autenticar, c.calibres);
router.get("/lineas",   autenticar, c.lineas);
router.get("/",         autenticar, c.listar);
router.post("/",        autenticar, audit("registrar_pesaje"), c.crear);
router.put("/:id",     autenticar, nivelSupervisor, audit("editar_pesaje"),   c.actualizar);
router.delete("/:id",  autenticar, nivelJefe,       audit("eliminar_pesaje"), c.eliminar);
module.exports=router;
