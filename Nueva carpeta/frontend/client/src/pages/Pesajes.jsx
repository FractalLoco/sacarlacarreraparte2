import { useState, useEffect } from "react";
import { Plus, Trash2, Scale } from "lucide-react";
import { PanelCard } from "../components/atoms/Overlay";
import { pesajesAPI } from "../api/client";
import { C, iS, fmt, fmtFecha, fmtDecimal, hoy } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

export default function Pesajes({ lote, onToast }) {
  const { esSupervisor } = useAuth();
  const [pesajes,   setPesajes]   = useState([]);
  const [tipos,     setTipos]     = useState([]);
  const [calibres,  setCalibres]  = useState([]);
  const [lineas,    setLineas]    = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form,      setForm]      = useState({});
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const cargar = () => pesajesAPI.listar({lote_id:lote.id}).then(setPesajes).catch(e=>onToast(e.message,"error"));

  useEffect(()=>{
    cargar();
    pesajesAPI.tipos().then(setTipos);
    pesajesAPI.lineas().then(setLineas);
  },[lote.id]);

  useEffect(()=>{
    if(form.producto_tipo_id) pesajesAPI.calibres(form.producto_tipo_id).then(setCalibres);
    else setCalibres([]);
  },[form.producto_tipo_id]);

  const abrirModal = () => {
    setForm({ lote_id:lote.id, linea_id:"", producto_tipo_id:"", calibre_id:"", kilos:"", cajas:"", bandejas:"", fecha_elaboracion:hoy(), observacion:"" });
    setModalOpen(true);
  };

  const guardar = async () => {
    try {
      await pesajesAPI.crear(form);
      onToast("Pesaje registrado correctamente");
      setModalOpen(false); cargar();
    } catch(e) { onToast(e.message,"error"); }
  };

  const eliminar = async (id) => {
    try { await pesajesAPI.eliminar(id); onToast("Pesaje eliminado","warning"); cargar(); }
    catch(e) { onToast(e.message,"error"); }
  };

  // Totales por tipo
  const totalesPorTipo = tipos.map(t=>{
    const ps = pesajes.filter(p=>p.producto_tipo_id===t.id);
    return { ...t, kilos: ps.reduce((s,p)=>s+parseFloat(p.kilos||0),0), cajas: ps.reduce((s,p)=>s+parseInt(p.cajas||0),0), count: ps.length };
  });

  const kb = parseFloat(lote.kilos_brutos||0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Header del lote */}
      <div style={{background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,borderRadius:16,padding:"18px 22px",color:"white"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div>
            <p style={{fontSize:11,opacity:.6,fontWeight:700,letterSpacing:.5}}>LOTE EN PROCESO</p>
            <h2 style={{fontSize:22,fontWeight:800,marginTop:2}}>{lote.codigo}</h2>
            <p style={{fontSize:12,opacity:.6,marginTop:2}}>{fmtFecha(lote.fecha_ingreso)} · {fmt(lote.kilos_brutos)} kg brutos</p>
          </div>
          <button onClick={abrirModal} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            <Plus size={15}/> Registrar Pesaje
          </button>
        </div>
      </div>

      {/* Resumen por tipo */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
        {totalesPorTipo.map(t=>{
          const rend = kb>0?((t.kilos/kb)*100).toFixed(2):"0.00";
          const color = t.es_desecho?C.danger:C.blue600;
          return (
            <div key={t.id} style={{background:"white",borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 16px",boxShadow:"0 1px 6px rgba(0,0,0,.04)"}}>
              <p style={{fontWeight:700,fontSize:13,color:C.blue900,marginBottom:8}}>{t.nombre}</p>
              <p style={{fontSize:20,fontWeight:800,color}}>{fmt(t.kilos)} <span style={{fontSize:11,fontWeight:400,color:C.textMut}}>kg</span></p>
              {!t.es_desecho&&<p style={{fontSize:11,color:C.textMut,marginTop:2}}>{t.cajas} cajas</p>}
              <div style={{height:4,background:"#e2e8f0",borderRadius:2,overflow:"hidden",marginTop:8}}>
                <div style={{width:`${Math.min(parseFloat(rend),100)}%`,height:"100%",background:color,borderRadius:2}}/>
              </div>
              <p style={{fontSize:10,color:C.textMut,marginTop:3,fontWeight:700}}>{rend}%</p>
            </div>
          );
        })}
      </div>

      {/* Tabla de pesajes */}
      <PanelCard title="Pesajes Registrados" icon={<Scale size={15} color={C.blue500}/>}
        action={<span style={{fontSize:12,fontWeight:700,color:C.textMut}}>{pesajes.length} registros</span>}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:C.blue900}}>
                {["Producto","Calibre","Línea","Kilos","Cajas","Bandejas","Fecha","Registrado por",""].map(h=>(
                  <th key={h} style={{padding:"9px 13px",textAlign:"left",fontSize:11,fontWeight:700,color:C.blue300,letterSpacing:.4,whiteSpace:"nowrap"}}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pesajes.map(p=>(
                <tr key={p.id} className="row" style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"10px 13px",fontWeight:700,color:p.es_desecho?C.danger:C.text}}>{p.producto_tipo_nombre}</td>
                  <td style={{padding:"10px 13px",color:C.textMut,fontSize:12}}>{p.calibre_nombre||"—"}</td>
                  <td style={{padding:"10px 13px",color:C.textSub}}>{p.linea_nombre||"—"}</td>
                  <td style={{padding:"10px 13px",fontWeight:700,color:C.blue900}}>{fmtDecimal(p.kilos)} kg</td>
                  <td style={{padding:"10px 13px",color:C.textSub}}>{p.cajas||"—"}</td>
                  <td style={{padding:"10px 13px",color:C.textSub}}>{p.bandejas||"—"}</td>
                  <td style={{padding:"10px 13px",color:C.textSub,fontSize:12,whiteSpace:"nowrap"}}>{fmtFecha(p.fecha_elaboracion)}</td>
                  <td style={{padding:"10px 13px",color:C.textSub,fontSize:12}}>{p.registrado_por_nombre||"—"}</td>
                  <td style={{padding:"10px 13px"}}>
                    {esSupervisor&&<button onClick={()=>eliminar(p.id)} style={{padding:"5px 8px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:7,color:C.danger,cursor:"pointer",display:"flex",alignItems:"center"}}>
                      <Trash2 size={12}/>
                    </button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      {/* Modal nuevo pesaje */}
      {modalOpen && (
        <div onClick={e=>{if(e.target===e.currentTarget)setModalOpen(false);}} style={{position:"fixed",inset:0,zIndex:200,overflowY:"auto",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"20px 12px",background:"rgba(10,26,74,.72)",backdropFilter:"blur(4px)",WebkitOverflowScrolling:"touch"}}>
          <div style={{background:"white",borderRadius:20,width:"100%",maxWidth:500,overflow:"hidden",boxShadow:"0 25px 60px rgba(0,0,0,.3)"}}>
            <div style={{padding:"18px 22px",background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"white",fontWeight:800,fontSize:16}}>Registrar Pesaje — {lote.codigo}</span>
              <button onClick={()=>setModalOpen(false)} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",color:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{padding:24,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {/* Línea */}
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Línea de Producción</label>
                <select value={form.linea_id||""} onChange={e=>set("linea_id",+e.target.value)} style={iS}>
                  <option value="">Seleccionar...</option>
                  {lineas.map(l=><option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              </div>
              {/* Tipo producto */}
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Tipo de Producto</label>
                <select value={form.producto_tipo_id||""} onChange={e=>set("producto_tipo_id",+e.target.value)} style={iS}>
                  <option value="">Seleccionar...</option>
                  {tipos.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              {/* Calibre */}
              {calibres.length>0&&<div style={{gridColumn:"span 2"}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Calibre</label>
                <select value={form.calibre_id||""} onChange={e=>set("calibre_id",+e.target.value||null)} style={iS}>
                  <option value="">Sin calibre específico</option>
                  {calibres.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>}
              {/* Kilos */}
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Kilos</label>
                <input type="number" step="0.01" value={form.kilos||""} onChange={e=>set("kilos",e.target.value)} style={iS} placeholder="0.00"/>
              </div>
              {/* Cajas */}
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Cajas</label>
                <input type="number" value={form.cajas||""} onChange={e=>set("cajas",+e.target.value||null)} style={iS} placeholder="0"/>
              </div>
              {/* Bandejas */}
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Bandejas</label>
                <input type="number" value={form.bandejas||""} onChange={e=>set("bandejas",+e.target.value||null)} style={iS} placeholder="0"/>
              </div>
              {/* Fecha */}
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Fecha Elaboración</label>
                <input type="date" value={form.fecha_elaboracion||""} onChange={e=>set("fecha_elaboracion",e.target.value)} style={iS}/>
              </div>
              {/* Observacion */}
              <div style={{gridColumn:"span 2"}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Observación</label>
                <textarea rows={2} value={form.observacion||""} onChange={e=>set("observacion",e.target.value)} style={{...iS,resize:"none"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,padding:"16px 24px",borderTop:`1px solid ${C.border}`,background:C.blue50}}>
              <button onClick={()=>setModalOpen(false)} style={{flex:1,padding:"10px",background:"white",border:`1px solid ${C.border}`,borderRadius:11,color:C.textSub,fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Cancelar</button>
              <button onClick={guardar} disabled={!form.linea_id||!form.producto_tipo_id||!form.kilos} style={{flex:2,padding:"10px",background:`linear-gradient(135deg,${C.blue900},${C.blue600})`,border:"none",borderRadius:11,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                <Scale size={14}/> Registrar Pesaje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}