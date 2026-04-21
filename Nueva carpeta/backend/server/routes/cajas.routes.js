const express = require("express");
const { generarCajasLote, listarCajasLote, listarCajasCarro, validarCompatibilidadCarro } = require("../controllers/cajas.controller");
const { autenticar } = require("../middleware/auth");

const r = express.Router();

r.post("/lote/:lote_id/generar", autenticar, generarCajasLote);
r.get("/lote/:lote_id", autenticar, listarCajasLote);
r.get("/carro/:carro_id", autenticar, listarCajasCarro);
r.post("/validar-carro", autenticar, validarCompatibilidadCarro);

module.exports = r;

module.exports = r;
