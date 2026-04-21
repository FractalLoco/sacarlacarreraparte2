import { useState, useEffect, useCallback } from "react";
import { useAuth }       from "./context/AuthContext";
import { useToast }      from "./hooks/useToast";
import { Navbar }        from "./components/Navbar";
import { Toast }         from "./components/atoms/Toast";
import Dashboard         from "./pages/Dashboard";
import Lotes             from "./pages/Lotes";
import Pesajes           from "./pages/Pesajes";
import CargarCarros      from "./pages/CargarCarros";
import Tuneles           from "./pages/Tuneles";
import Inventario        from "./pages/Inventario";
import Despachos         from "./pages/Despachos";
import ImprimirEtiquetas from "./pages/ImprimirEtiquetas";
import Reportes          from "./pages/Reportes";
import Usuarios          from "./pages/Usuarios";
import Trazabilidad      from "./pages/Trazabilidad";
import AuditLog          from "./pages/AuditLog";
import Proveedores       from "./pages/Proveedores";
import Conductores       from "./pages/Conductores";
import Recepcion         from "./pages/Recepcion";
import HACCP             from "./pages/HACCP";
import Configuracion     from "./pages/Configuracion";
import { lotesAPI, usuariosAPI } from "./api/client";
import { C } from "./constants/theme";

const G=`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Plus Jakarta Sans",system-ui,sans-serif;background:${C.slate};-webkit-font-smoothing:antialiased}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes popIn{from{opacity:0;transform:scale(.93) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
.fadein{animation:fadeUp .35s ease both}
.row:nth-child(even){background:${C.blue50}}
.row:hover{background:${C.blue100} !important}
input:focus,select:focus,textarea:focus{outline:none;border-color:${C.blue500} !important;box-shadow:0 0 0 3px ${C.blue200} !important}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:${C.blue300};border-radius:4px}
`;

export default function App() {
  const { esAdmin }           = useAuth();
  const { toast, mostrar:t$ } = useToast();
  const [vista,    setVista]   = useState("dashboard");
  const [loteAct,  setLoteAct] = useState(null);
  const [usuarios, setUsuarios]= useState([]);
  const [roles,    setRoles]   = useState([]);

  const cargarUsuarios = useCallback(() => {
    if (!esAdmin) return;
    Promise.all([usuariosAPI.listar(),usuariosAPI.roles()]).then(([u,r])=>{setUsuarios(u);setRoles(r);}).catch(()=>{});
  },[esAdmin]);

  const cargarLoteActivo = useCallback(() => {
    lotesAPI.activo().then(setLoteAct).catch(()=>setLoteAct(null));
  },[]);

  useEffect(()=>{ cargarLoteActivo(); cargarUsuarios(); },[]);

  const irAPesajes = (lote) => { setLoteAct(lote); setVista("pesajes"); };

  return (
    <>
      <style>{G}</style>
      <Navbar vista={vista} onNavegar={setVista}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",paddingTop:54,width:"100%",overflow:"auto"}}>
        <main className="fadein" key={vista} style={{flex:1,padding:"16px",maxWidth:"100%",margin:"0 auto",width:"100%"}}>
          {vista==="dashboard"    && <Dashboard onToast={t$}/>}
          {vista==="lotes"        && <Lotes onToast={t$} onVerPesajes={irAPesajes}/>}
          {vista==="recepcion"    && <Recepcion onToast={t$}/>}
          {vista==="haccp"        && <HACCP onToast={t$}/>}
          {vista==="pesajes"      && (
            loteAct
              ? <Pesajes lote={loteAct} onToast={t$}/>
              : <div style={{background:"white",borderRadius:16,border:`1px solid ${C.border}`,padding:60,textAlign:"center"}}>
                  <p style={{fontWeight:700,color:C.textSub,fontSize:16}}>No hay lote en proceso</p>
                  <p style={{fontSize:13,color:C.textMut,marginTop:8}}>Ve a <strong>Lotes</strong> e inicia uno</p>
                  <button onClick={()=>setVista("lotes")} style={{marginTop:20,padding:"10px 24px",background:C.blue900,border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Ir a Lotes</button>
                </div>
          )}
          {vista==="cargarcarros" && <CargarCarros onToast={t$}/>}
          {vista==="tuneles"      && <Tuneles onToast={t$}/>}
          {vista==="inventario"   && <Inventario onToast={t$}/>}
          {vista==="despachos"    && <Despachos onToast={t$}/>}
          {vista==="etiquetas"    && <ImprimirEtiquetas onToast={t$}/>}
          {vista==="trazabilidad" && <Trazabilidad onToast={t$}/>}
          {vista==="reportes"     && <Reportes onToast={t$}/>}
          {vista==="proveedores"  && <Proveedores onToast={t$}/>}
          {vista==="conductores"  && <Conductores onToast={t$}/>}
          {vista==="configuracion"&& <Configuracion onToast={t$}/>}
          {vista==="audit"        && esAdmin && <AuditLog onToast={t$}/>}
          {vista==="usuarios"     && esAdmin && <Usuarios usuarios={usuarios} roles={roles} onRecargar={cargarUsuarios} onToast={t$}/>}
        </main>
      </div>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo}/>}
    </>
  );
}
