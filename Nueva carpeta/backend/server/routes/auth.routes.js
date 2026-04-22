"use strict";
const router    = require("express").Router();
const c         = require("../controllers/auth.controller");
const { autenticar } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const limiterPassword = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Demasiados intentos de cambio de contrasena" },
  standardHeaders: true,
  legacyHeaders: false,
});

const limiterRefresh = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: "Demasiadas solicitudes de refresco" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login",    c.login);
router.post("/logout",   c.logout);
router.post("/refresh",  limiterRefresh, c.refresh);
router.get ("/me",       autenticar, c.me);
router.put ("/password", autenticar, limiterPassword, c.cambiarPassword);

module.exports = router;
