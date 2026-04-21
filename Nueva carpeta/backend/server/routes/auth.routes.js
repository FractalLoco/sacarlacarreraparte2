"use strict";
const router=require("express").Router();
const c=require("../controllers/auth.controller");
const {autenticar}=require("../middleware/auth");
router.post("/login",c.login);
router.get("/me",autenticar,c.me);
router.put("/password",autenticar,c.cambiarPassword);
module.exports=router;