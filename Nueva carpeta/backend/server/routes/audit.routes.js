"use strict";
const router=require("express").Router();
const c=require("../controllers/audit.controller");
const {autenticar,nivelJefe}=require("../middleware/auth");
router.get("/",autenticar,nivelJefe,c.listar);
module.exports=router;
