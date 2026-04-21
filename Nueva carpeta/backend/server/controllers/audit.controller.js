"use strict";
const pool = require("../config/db");

const listar = async (req,res) => {
  try {
    const {usuario_id,accion,desde,hasta,limite=100}=req.query;
    let q=`SELECT al.*,u.nombre AS usuario_nombre,u.email AS usuario_email,r.nombre AS usuario_rol
      FROM audit_log al LEFT JOIN usuarios u ON u.id=al.usuario_id LEFT JOIN roles r ON r.id=u.rol_id WHERE 1=1`;
    const p=[];
    if(usuario_id){p.push(usuario_id);q+=` AND al.usuario_id=$${p.length}`;}
    if(accion){p.push(`%${accion}%`);q+=` AND al.accion ILIKE $${p.length}`;}
    if(desde){p.push(desde);q+=` AND DATE(al.created_at)>=$${p.length}`;}
    if(hasta){p.push(hasta);q+=` AND DATE(al.created_at)<=$${p.length}`;}
    q+=` ORDER BY al.created_at DESC LIMIT ${parseInt(limite)||100}`;
    const {rows}=await pool.query(q,p);
    return res.json(rows);
  } catch(e){return res.status(500).json({error:"Error interno"});}
};

module.exports={listar};