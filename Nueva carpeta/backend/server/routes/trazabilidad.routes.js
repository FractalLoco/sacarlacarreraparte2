"use strict";
const router=require("express").Router();
const c=require("../controllers/trazabilidad.controller");
const {autenticar}=require("../middleware/auth");
router.get("/lotes",     autenticar, c.buscarLotes);
router.get("/lotes/:id", autenticar, c.trazabilidadLote);
module.exports=router;
