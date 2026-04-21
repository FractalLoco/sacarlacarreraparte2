"use strict";
require("dotenv").config();
const express=require("express"),cors=require("cors"),helmet=require("helmet"),morgan=require("morgan");
const rateLimit=require("express-rate-limit"),pool=require("./config/db");

const app=express(),PORT=process.env.PORT||4001;
app.use(helmet());
app.use(cors({origin:process.env.CLIENT_URL||"http://localhost:5174",credentials:true}));
app.use(rateLimit({windowMs:15*60*1000,max:500,message:{error:"Demasiadas peticiones"}}));
app.use("/api/auth/login",rateLimit({windowMs:10*60*1000,max:10,message:{error:"Demasiados intentos"}}));
app.use(express.json());
// Los archivos de recepción se sirven a través de /api/recepcion/archivos/:id/ver
// No necesitamos servir /uploads directamente
app.use(morgan(process.env.NODE_ENV==="production"?"combined":"dev"));

app.use("/api/auth",          require("./routes/auth.routes"));
app.use("/api/usuarios",      require("./routes/usuarios.routes"));
app.use("/api/proveedores",   require("./routes/proveedores.routes"));
app.use("/api/conductores",   require("./routes/conductores.routes"));
app.use("/api/lotes",         require("./routes/lotes.routes"));
app.use("/api/pesajes",       require("./routes/pesajes.routes"));
app.use("/api/cajas",         require("./routes/cajas.routes"));
app.use("/api/turnos",        require("./routes/turnos.routes"));
app.use("/api/tuneles",       require("./routes/tuneles.routes"));
app.use("/api/inventario",    require("./routes/inventario.routes"));
app.use("/api/despachos",     require("./routes/despachos.routes"));
app.use("/api/dashboard",     require("./routes/dashboard.routes"));
app.use("/api/reportes",      require("./routes/reportes.routes"));
app.use("/api/trazabilidad",  require("./routes/trazabilidad.routes"));
app.use("/api/haccp",       require("./routes/haccp.routes"));
app.use("/api/recepcion",     require("./routes/recepcion.routes"));
app.use("/api/configuracion", require("./routes/configuracion.routes"));
app.use("/api/audit",         require("./routes/audit.routes"));

app.get("/health",(_req,res)=>res.json({status:"ok",sistema:"TR3S AL MAR v5"}));
app.use((_req,res)=>res.status(404).json({error:"Ruta no encontrada"}));
app.use((err,_req,res,_n)=>{console.error(err.message);res.status(500).json({error:"Error interno"});});

const start=async()=>{
  try{
    await pool.query("SELECT 1");
    app.listen(PORT,()=>{
      console.log("\n🦑 TR3S AL MAR — Sistema de Produccion v5");
      console.log(`   Puerto: http://localhost:${PORT}`);
      console.log("   OK PostgreSQL\n");
    });
  }catch(e){console.error("No se pudo conectar:",e.message);process.exit(1);}
};
start();
