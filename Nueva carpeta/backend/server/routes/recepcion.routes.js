"use strict";
const router  = require("express").Router();
const multer  = require("multer");
const path    = require("path");
const crypto  = require("crypto");
const c       = require("../controllers/recepcion.controller");
const { autenticar } = require("../middleware/auth");
const audit   = require("../middleware/audit");

// memoryStorage: el archivo queda en req.file.buffer (no toca el disco)
// El controller decide si lo guarda en Supabase Storage o en disco local
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20*1024*1024 }, // 20 MB máx
  fileFilter: (_req,file,cb) => {
    const allowed = /jpg|jpeg|png|gif|webp|pdf|doc|docx|xlsx|xls/;
    const ext = path.extname(file.originalname).toLowerCase().replace(".","");
    cb(null, allowed.test(ext));
  },
});

// Genera un nombre único para el archivo (sin depender del disco)
const asignarNombre = (req, _res, next) => {
  if (req.file) {
    const ext  = path.extname(req.file.originalname).toLowerCase();
    const name = crypto.randomBytes(12).toString("hex");
    req.file.filename = `${Date.now()}_${name}${ext}`;
  }
  next();
};

router.get("/:lote_id/archivos",      autenticar, c.listarArchivos);
router.post("/:lote_id/archivos",     autenticar, upload.single("archivo"), asignarNombre, audit("subir_archivo"), c.subirArchivo);
router.get("/archivos/:id/descargar", autenticar, c.descargarArchivo);
router.get("/archivos/:id/ver",       autenticar, c.verArchivo);
router.delete("/archivos/:id",        autenticar, audit("eliminar_archivo"), c.eliminarArchivo);
router.get("/:lote_id/imprimir",      autenticar, c.imprimirRecepcion);

module.exports = router;
