"use strict";
const router=require("express").Router();
const c=require("../controllers/dashboard.controller");
const {autenticar}=require("../middleware/auth");
router.get("/",autenticar,c.stats);
module.exports=router;