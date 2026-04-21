import { useState } from "react";
import { Search, GitBranch, Package, Box, Thermometer, Clock, User, AlertTriangle } from "lucide-react";
import { PanelCard } from "../components/atoms/Overlay";
import { trazabilidadAPI } from "../api/client";
import { C, iS, fmt, fmtFecha, fmtDecimal } from "../constants/theme";
import { useResponsive } from "../hooks/useResponsive";

const ESTADOS = {
  pendiente:  {bg:"#f1f5f9",text:"#64748b"},
  en_proceso: {bg:"#dcfce7",text:"#15803d"},
  cerrado:    {bg:"#dbeafe",text:"#1d4ed8"},
};

export default function Trazabilidad({ onToast }) {
  const { isMobile } = useResponsive();
  const [filtros,  setFiltros]  = useState({codigo:"",estado:"",fecha_desde:"",fecha_hasta:"",kilos_min:"",kilos_max:"",q:""});
  const [lotes,    setLotes]    = useState([]);
  const [detalle,  setDetalle]  = useState(null);
  const [cargando, setCargando] = useState(false);

  const buscar = async () => {
    setCargando(true);
    trazabilidadAPI.buscar(filtros)
      .then(setLotes)
      .catch(e=>onToast(e.message,"error"))
      .finally(()=>setCargando(false));
  };

  const verDetalle = async (id) => {
    setCargando(true);
    trazabilidadAPI.detalle(id)
      .then(setDetalle)
      .catch(e=>onToast(e.message,"error"))
      .finally(()=>setCargando(false));
  };

  const set = (k,v) => setFiltros(p=>({...p,[k]:v}));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Panel de búsqueda */}
      <PanelCard title="Buscar Lotes" icon={<Search size={15} color={C.blue500}/>}>
        <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12}}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Código / Texto</label>
              <input value={filtros.q} onChange={e=>set("q",e.target.value)} onKeyDown={e=>e.key==="Enter"&&buscar()} placeholder="Lote, guía, factura, proveedor..." style={iS}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Estado</label>
              <select value={filtros.estado} onChange={e=>set("estado",e.target.value)} style={iS}>
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En Proceso</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Código Lote</label>
              <input value={filtros.codigo} onChange={e=>set("codigo",e.target.value)} placeholder="JIB7524" style={iS}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Fecha Desde</label>
              <input type="date" value={filtros.fecha_desde} onChange={e=>set("fecha_desde",e.target.value)} style={iS}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Fecha Hasta</label>
              <input type="date" value={filtros.fecha_hasta} onChange={e=>set("fecha_hasta",e.target.value)} style={iS}/>
            </div>
            <div style={{display:"flex",alignItems:"flex-end"}}>
              <button onClick={buscar} disabled={cargando} style={{width:"100%",padding:"11px",background:`linear-gradient(135deg,${C.blue900},${C.blue600})`,border:"none",borderRadius:11,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                <Search size={14}/>{cargando?"Buscando...":"Buscar Lotes"}
              </button>
            </div>
          </div>
        </div>
      </PanelCard>

      {/* Resultados */}
      {lotes.length>0&&(
        <PanelCard title={`${lotes.length} lotes encontrados`} icon={<Package size={15} color={C.blue500}/>}>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {lotes.map((l,idx)=>{
              const e=ESTADOS[l.estado]||ESTADOS.pendiente;
              const kb=parseFloat(l.kilos_brutos||0);
              const kp=parseFloat(l.kilos_producidos||0);
              return (
                <div key={l.id} className="row" style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",cursor:"pointer",transition:"background .15s"}} onClick={()=>verDetalle(l.id)}>
                  <div style={{minWidth:80}}>
                    <p style={{fontWeight:800,fontSize:16,color:C.blue900}}>{l.codigo}</p>
                    <p style={{fontSize:11,color:C.textMut}}>{fmtFecha(l.fecha_ingreso)}</p>
                  </div>
                  <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:e.bg,color:e.text}}>{l.estado}</span>
                  <div style={{flex:1,display:"flex",gap:14,flexWrap:"wrap"}}>
                    {[{l:"Kg Brutos",v:`${fmt(l.kilos_brutos)}`},{l:"Producidos",v:`${fmt(l.kilos_producidos)}`},{l:"Rendimiento",v:kb>0?`${((kp/kb)*100).toFixed(1)}%`:"—"},{l:"Carros",v:l.total_carros},{l:"Cajas",v:l.total_cajas}].map(({l:lb,v})=>(
                      <div key={lb} style={{textAlign:"center"}}>
                        <p style={{fontSize:9,color:C.textMut,fontWeight:700,textTransform:"uppercase"}}>{lb}</p>
                        <p style={{fontSize:14,fontWeight:800,color:C.blue900}}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <span style={{fontSize:12,color:C.blue500,fontWeight:700}}>Ver detalle →</span>
                </div>
              );
            })}
          </div>
        </PanelCard>
      )}

      {/* Detalle de trazabilidad */}
      {detalle&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Header del lote */}
          <div style={{background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,borderRadius:16,padding:"18px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <GitBranch size={20} color="white"/>
                  <h2 style={{color:"white",fontWeight:800,fontSize:20}}>Trazabilidad: {detalle.lote.codigo}</h2>
                </div>
                <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                  {[["Ingreso",fmtFecha(detalle.lote.fecha_ingreso)],["Kg Brutos",`${fmt(detalle.lote.kilos_brutos)} kg`],["Carros",detalle.carros.length],["Cajas",detalle.cajas.length],["Pesajes",detalle.pesajes.length]].map(([l,v])=>(
                    <div key={l} style={{textAlign:"center"}}>
                      <p style={{fontSize:9,color:"rgba(255,255,255,.5)",fontWeight:700,textTransform:"uppercase"}}>{l}</p>
                      <p style={{fontSize:16,fontWeight:800,color:"white"}}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={()=>setDetalle(null)} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:9,padding:"7px 14px",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✕ Cerrar</button>
            </div>
          </div>

          {/* Timeline */}
          <PanelCard title="Línea de Tiempo de Eventos" icon={<Clock size={15} color={C.blue500}/>}>
            <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:0}}>
              {detalle.timeline.map((ev,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<detalle.timeline.length-1?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:C.blue50,border:`2px solid ${C.blue200}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                    <Clock size={13} color={C.blue600}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:2}}>
                      <span style={{fontWeight:700,fontSize:13,color:C.text}}>{ev.evento}</span>
                      <span style={{fontSize:11,color:C.textMut}}>{ev.fecha?new Date(ev.fecha).toLocaleString("es-CL"):"—"}</span>
                    </div>
                    <p style={{fontSize:12,color:C.textSub}}>{ev.detalle}</p>
                    {ev.usuario&&<p style={{fontSize:11,color:C.textMut,marginTop:2,display:"flex",alignItems:"center",gap:4}}><User size={10}/> {ev.usuario}</p>}
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>

          {/* Carros y sus cajas */}
          <PanelCard title="Carros y Cajas" icon={<Box size={15} color={C.blue500}/>}>
            <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:12}}>
              {detalle.carros.map(c=>{
                const cajasDelCarro=detalle.cajas.filter(ca=>ca.carro_id===c.id);
                return (
                  <div key={c.id} style={{border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                    <div style={{background:C.blue50,padding:"10px 14px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                      <span style={{fontWeight:800,fontSize:15,color:C.blue900}}>{c.codigo_carro}</span>
                      <span style={{fontSize:12,color:C.textSub}}>{cajasDelCarro.length} cajas</span>
                      <span style={{fontSize:12,fontWeight:700,color:C.blue900}}>{fmt(c.kilos_totales||0)} kg</span>
                      <span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:700,background:"#f1f5f9",color:"#64748b"}}>{c.estado}</span>
                    </div>
                    {!isMobile&&cajasDelCarro.length>0&&(
                      <div style={{overflowX:"auto"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead><tr style={{background:"#f8fafc"}}>
                            {["N° Caja","Producto","Calibre","Kilos","Fecha Elab.","Registrado"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.textMut}}>{h.toUpperCase()}</th>)}
                          </tr></thead>
                          <tbody>
                            {cajasDelCarro.map(ca=>(
                              <tr key={ca.id} style={{borderTop:`1px solid ${C.border}`}}>
                                <td style={{padding:"8px 12px",fontWeight:700,color:C.blue900}}>{ca.numero_caja}</td>
                                <td style={{padding:"8px 12px",color:C.text}}>{ca.producto}</td>
                                <td style={{padding:"8px 12px",color:C.textMut}}>{ca.calibre||"—"}</td>
                                <td style={{padding:"8px 12px",fontWeight:700,color:C.blue900}}>{fmt(ca.kilos_netos)} kg</td>
                                <td style={{padding:"8px 12px",color:C.textMut}}>{fmtFecha(ca.fecha_elaboracion)}</td>
                                <td style={{padding:"8px 12px",color:C.textMut}}>{ca.registrado_por||"—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {isMobile&&cajasDelCarro.length>0&&(
                      <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:6}}>
                        {cajasDelCarro.map(ca=>(
                          <div key={ca.id} style={{background:"white",borderRadius:8,padding:"8px 10px",border:`1px solid ${C.border}`}}>
                            <p style={{fontWeight:700,color:C.blue900}}>Caja {ca.numero_caja} · {ca.producto}{ca.calibre?" "+ca.calibre:""}</p>
                            <p style={{fontSize:12,color:C.textMut,marginTop:2}}>{fmt(ca.kilos_netos)} kg · {fmtFecha(ca.fecha_elaboracion)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </PanelCard>

          {/* Historial túneles */}
          {detalle.historial_tuneles.length>0&&(
            <PanelCard title="Historial en Túneles" icon={<Thermometer size={15} color={C.blue500}/>}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{background:C.blue900}}>
                    {["Carro","Túnel","Ingreso","Salida","T° Ingreso","T° Salida","Cajas","Registrado"].map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.blue300,letterSpacing:.4}}>{h.toUpperCase()}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {detalle.historial_tuneles.map(tc=>(
                      <tr key={tc.id} className="row" style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:"9px 12px",fontWeight:700,color:C.blue900}}>{tc.codigo_carro}</td>
                        <td style={{padding:"9px 12px",color:C.textSub}}>{tc.tunel_nombre}</td>
                        <td style={{padding:"9px 12px",color:C.textMut,fontSize:12}}>{tc.fecha_ingreso?new Date(tc.fecha_ingreso).toLocaleString("es-CL"):"—"}</td>
                        <td style={{padding:"9px 12px",color:C.textMut,fontSize:12}}>{tc.fecha_salida?new Date(tc.fecha_salida).toLocaleString("es-CL"):"En túnel"}</td>
                        <td style={{padding:"9px 12px",color:C.textMut,fontSize:12}}>{tc.temperatura_ingreso?`${tc.temperatura_ingreso}°C`:"—"}</td>
                        <td style={{padding:"9px 12px",color:C.textMut,fontSize:12}}>{tc.temperatura_salida?`${tc.temperatura_salida}°C`:"—"}</td>
                        <td style={{padding:"9px 12px",color:C.textSub}}>{tc.cajas_en_carro||0}</td>
                        <td style={{padding:"9px 12px",color:C.textMut,fontSize:12}}>{tc.registrado_por||"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelCard>
          )}
        </div>
      )}
    </div>
  );
}