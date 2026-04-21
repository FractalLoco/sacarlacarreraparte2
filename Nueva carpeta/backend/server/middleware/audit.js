"use strict";
const pool = require("../config/db");
const audit = (accion) => async (req,res,next) => {
  const orig = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode<400 && req.usuario) {
      try {
        await pool.query(
          "INSERT INTO audit_log(usuario_id,accion,tabla,detalle,ip) VALUES($1,$2,$3,$4,$5)",
          [req.usuario.id,accion,req.baseUrl.replace("/api/",""),JSON.stringify({params:req.params,body:req.body}).slice(0,500),req.ip]
        );
      } catch(e) {}
    }
    return orig(data);
  };
  next();
};
module.exports = audit;
