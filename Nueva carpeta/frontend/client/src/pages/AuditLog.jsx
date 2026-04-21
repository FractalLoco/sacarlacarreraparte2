import { useState, useEffect } from "react";
import { ClipboardList, Filter } from "lucide-react";
import { PanelCard } from "../components/atoms/Overlay";
import { auditAPI, usuariosAPI } from "../api/client";
import { C, iS, fmtFecha } from "../constants/theme";

const ACCION_COLORS = {
  crear_lote:      "#dcfce7", registrar_pesaje: "#dbeafe",
  crear_carro:     "#e0e7ff", crear_caja:        "#fef9c3",
  ingresar_carro_tunel:"#cffafe", salir_carro_tunel:"#e0e7ff",
  crear_usuario:   "#fce7f3", desactivar_usuario:"#fee2e2",
};

export default function AuditLog({ onToast }) {
  const [logs,     setLogs]     = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtros,  setFiltros]  = useState({usuario_id:"",accion:"",desde:"",hasta:"",limite:200});
  const set = (k,v) => setFiltros(p=>({...p,[k]:v}));

  useEffect(()=>{
    usuariosAPI.listar().then(setUsuarios).catch(()=>{});
    cargar();
  },[]);

  const cargar = () => {
    setCargando(true);
    auditAPI.listar(filtros).then(setLogs).catch(e=>onToast(e.message,"error")).finally(()=>setCargando(false));
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Filtros */}
      <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:"14px 16px",display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <Filter size={13} color={C.textMut}/>
        <div style={{flex:1,minWidth:160}}>
          <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Usuario</label>
          <select value={filtros.usuario_id} onChange={e=>set("usuario_id",e.target.value)} style={{...iS,padding:"8px 10px",fontSize:12}}>
            <option value="">Todos</option>
            {usuarios.map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>
        <div style={{flex:1,minWidth:160}}>
          <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Acción</label>
          <input value={filtros.accion} onChange={e=>set("accion",e.target.value)} placeholder="Buscar acción..." style={{...iS,padding:"8px 10px",fontSize:12}}/>
        </div>
        <div>
          <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Desde</label>
          <input type="date" value={filtros.desde} onChange={e=>set("desde",e.target.value)} style={{...iS,padding:"8px 10px",fontSize:12}}/>
        </div>
        <div>
          <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Hasta</label>
          <input type="date" value={filtros.hasta} onChange={e=>set("hasta",e.target.value)} style={{...iS,padding:"8px 10px",fontSize:12}}/>
        </div>
        <button onClick={cargar} style={{padding:"9px 18px",background:C.blue900,border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Buscar</button>
      </div>

      <PanelCard title={`Historial de Acciones (${logs.length})`} icon={<ClipboardList size={15} color={C.blue500}/>}>
        {cargando ? <p style={{padding:"40px 0",textAlign:"center",color:C.textMut}}>Cargando...</p> : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:C.blue900}}>
                  {["Fecha","Usuario","Rol","Acción","Módulo","IP"].map(h=>(
                    <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.blue300,letterSpacing:.4}}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length===0&&<tr><td colSpan={6} style={{padding:"48px 0",textAlign:"center",color:C.textMut}}>Sin registros</td></tr>}
                {logs.map(l=>(
                  <tr key={l.id} className="row" style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"9px 12px",color:C.textMut,fontSize:12,whiteSpace:"nowrap"}}>{l.created_at?new Date(l.created_at).toLocaleString("es-CL"):"—"}</td>
                    <td style={{padding:"9px 12px",fontWeight:700,color:C.text}}>{l.usuario_nombre||"Sistema"}</td>
                    <td style={{padding:"9px 12px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:"#f1f5f9",color:"#64748b"}}>{l.usuario_rol||"—"}</span></td>
                    <td style={{padding:"9px 12px"}}>
                      <span style={{padding:"2px 9px",borderRadius:6,fontSize:11,fontWeight:700,background:ACCION_COLORS[l.accion]||"#f1f5f9",color:C.text}}>{l.accion||"—"}</span>
                    </td>
                    <td style={{padding:"9px 12px",color:C.textSub,fontSize:12}}>{l.tabla||"—"}</td>
                    <td style={{padding:"9px 12px",color:C.textMut,fontSize:11,fontFamily:"monospace"}}>{l.ip||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}