"use strict";
const router = require("express").Router();
const c = require("../controllers/tuneles.controller");
const {autenticar} = require("../middleware/auth");
const audit = require("../middleware/audit");

router.get("/",                        autenticar, c.listar);
router.get("/carros",                  autenticar, c.listarCarros);
router.get("/cajas",                   autenticar, c.listarCajas);
router.get("/estado-carros",           autenticar, c.estadoCarros);
router.get("/exportar/carros",         autenticar, c.exportarCarrosExcel);

// Flujo simplificado (PRIMERO, antes de rutas genéricas)
router.get("/:tunel_id/carros-vacios",         autenticar, c.carrosVaciosDeTunel);
router.get("/lote/:lote_id/cajas-libres",      autenticar, c.cajasLibresDeLote);

router.get("/carros/:id/etiqueta",     autenticar, c.etiquetaCarro);
router.get("/cajas/:id/etiqueta",      autenticar, c.etiquetaCaja);
router.get("/:id/carros",             autenticar, c.carrosDeTunel);
router.post("/carros",                 autenticar, audit("crear_carro"),             c.crearCarro);
router.put("/carros/:id/listo",        autenticar, audit("carro_listo"),             c.marcarListo);
router.put("/carros/:id/ingresar",     autenticar, audit("ingresar_carro_tunel"),    c.ingresarCarroTunel);
router.put("/carros/:id/salir",        autenticar, audit("salir_carro_tunel"),       c.sacarCarroTunel);
router.put("/carros/:id",             autenticar, audit("editar_carro"),            c.editarCarro);
router.post("/carros/:carro_id/asignar-cajas", autenticar, audit("asignar_cajas"), c.asignarCajasAlCarro);
router.post("/carros/:carro_id/congelar",      autenticar, audit("congelar_carro"), c.congelarCarro);
router.get("/cajas/:id/etiqueta-zebra",         autenticar, c.etiquetaZebra);
router.get("/carros/:carro_id/etiquetas-zebra",  autenticar, c.etiquetasZebraCarro);
router.get("/lotes/:lote_id/etiquetas-zebra",    autenticar, c.etiquetasZebraLote);
router.get("/lotes/:lote_id/etiquetas-zpl",      autenticar, c.etiquetasZplLote);
router.put("/cajas/:id/asignar",       autenticar, audit("asignar_caja"),           c.asignarCaja);

module.exports = router;
