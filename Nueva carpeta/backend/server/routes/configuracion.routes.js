"use strict";
const router = require("express").Router();
const c = require("../controllers/configuracion.controller");
const {autenticar, nivelJefe} = require("../middleware/auth");
const audit = require("../middleware/audit");

router.get("/productos",        autenticar, c.listarProductos);
router.post("/productos",       autenticar, nivelJefe, audit("crear_producto"),  c.crearProducto);
router.put("/productos/:id",    autenticar, nivelJefe, audit("editar_producto"), c.actualizarProducto);

router.get("/calibres",         autenticar, c.listarCalibres);
router.post("/calibres",        autenticar, nivelJefe, audit("crear_calibre"),   c.crearCalibres);
router.put("/calibres/:id",     autenticar, nivelJefe, audit("editar_calibre"),  c.actualizarCalibre);

router.get("/lineas",           autenticar, c.listarLineas);
router.post("/lineas",          autenticar, nivelJefe, audit("crear_linea"),     c.crearLinea);
router.put("/lineas/:id",       autenticar, nivelJefe, audit("editar_linea"),    c.actualizarLinea);

router.get("/tuneles",          autenticar, c.listarTuneles);
router.post("/tuneles",         autenticar, nivelJefe, audit("crear_tunel"),     c.crearTunel);
router.put("/tuneles/:id",      autenticar, nivelJefe, audit("editar_tunel"),    c.actualizarTunel);

module.exports = router;
