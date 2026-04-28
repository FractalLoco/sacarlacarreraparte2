import { useState, useEffect } from "react";
import { Plus, Snowflake, History, Boxes, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { tunelesAPI, lotesAPI, cajasAPI } from "../api/client";
import { C, iS } from "../constants/theme";

const COLORS = ["#2563eb","#16a34a","#9333ea","#dc2626","#d97706","#0891b2"];
const fmt1   = n => parseFloat(n||0).toFixed(1);

export default function CargarCarros({ onToast }) {
  const [vista,      setVista]      = useState("activos");
  const [carros,     setCarros]     = useState([]);
  const [lotes,      setLotes]      = useState([]);
  const [tuneles,    setTuneles]    = useState([]);

  const [selCarro,   setSelCarro]   = useState(null);
  const [selLote,    setSelLote]    = useState("");
  const [cajasLibres,setCajasLibres]= useState([]);

  const [nuevoCod,   setNuevoCod]   = useState("");
  const [ocupado,    setOcupado]    = useState(false);

  /* modal → túnel */
  const [modalTunel, setModalTunel] = useState(null);
  const [temps,      setTemps]      = useState({ t1:"",t2:"",t3:"" });
  const [tunelDest,  setTunelDest]  = useState("");

  /* modal congelar */
  const [modalCongelar, setModalCongelar] = useState(null);
  const [tempSal,    setTempSal]    = useState("");

  /* historial: fila expandida */
  const [filaAbierta, setFilaAbierta] = useState(null); // carro.id
  const [cajasHist,   setCajasHist]   = useState({});   // {carro_id: [cajas]}

  const recargar = async () => {
    try {
      const [cs, ls, ts] = await Promise.all([
        tunelesAPI.carros({}),
        lotesAPI.listar({ estado:"en_proceso" }),
        tunelesAPI.listar(),
      ]);
      setCarros(cs); setLotes(ls); setTuneles(ts);
    } catch(e) { onToast(e.message,"error"); }
  };

  useEffect(() => { recargar(); }, []);

  useEffect(() => {
    if (selLote) {
      tunelesAPI.cajasLibresDeLote(selLote)
        .then(setCajasLibres)
        .catch(e => onToast(e.message,"error"));
    } else setCajasLibres([]);
  }, [selLote]);

  /* ── crear carro ── */
  const crearCarro = async () => {
    setOcupado(true);
    try {
      const n = await tunelesAPI.crearCarro({ codigo_carro: nuevoCod || undefined });
      setNuevoCod("");
      await recargar();
      setSelCarro(n.id);
      onToast(`Carro ${n.codigo_carro} creado`,"success");
    } catch(e) { onToast(e.message,"error"); }
    setOcupado(false);
  };

  /* ── asignar una caja (clic directo) ── */
  const asignarCaja = async (caja) => {
    const carro = carros.find(c => c.id === selCarro);
    if (!carro) return;
    try {
      await tunelesAPI.asignarCajasAlCarro(carro.id, { caja_ids:[caja.id] });
      setCajasLibres(prev => prev.filter(c => c.id !== caja.id));
      await recargar();
    } catch(e) { onToast(e.message,"error"); }
  };

  /* ── enviar al túnel ── */
  const confirmarTunel = async () => {
    if (!temps.t1||!temps.t2||!temps.t3) return onToast("Faltan temperaturas","error");
    if (!tunelDest) return onToast("Selecciona un túnel","error");
    const c = modalTunel;
    setOcupado(true);
    try {
      if (c.estado === "cargando")
        await tunelesAPI.marcarListo(c.id,{ temp1:temps.t1, temp2:temps.t2, temp3:temps.t3 });
      await tunelesAPI.ingresarCarro(c.id,{ tunel_id:parseInt(tunelDest) });
      onToast(`✓ ${c.codigo_carro} ingresado al túnel`,"success");
      setModalTunel(null);
      if (selCarro===c.id) { setSelCarro(null); setSelLote(""); }
      await recargar();
    } catch(e) { onToast(e.message,"error"); }
    setOcupado(false);
  };

  /* ── eliminar carro ── */
  const eliminarCarro = async (carro) => {
    if (!window.confirm(`¿Eliminar el carro ${carro.codigo_carro}? Sus cajas quedarán sin asignar.`)) return;
    setOcupado(true);
    try {
      await tunelesAPI.eliminarCarro(carro.id);
      if (selCarro === carro.id) { setSelCarro(null); setSelLote(""); }
      onToast(`Carro ${carro.codigo_carro} eliminado`, "success");
      await recargar();
    } catch(e) { onToast(e.message, "error"); }
    setOcupado(false);
  };

  /* ── congelar ── */
  const confirmarCongelar = async () => {
    const c = modalCongelar;
    setOcupado(true);
    try {
      await tunelesAPI.sacarCarro(c.id,{ temperatura_salida: tempSal ? parseFloat(tempSal) : null });
      onToast(`✓ ${c.codigo_carro} congelado`,"success");
      setModalCongelar(null);
      if (selCarro===c.id) setSelCarro(null);
      await recargar();
    } catch(e) { onToast(e.message,"error"); }
    setOcupado(false);
  };

  const activos     = carros.filter(c => c.estado !== "congelado");
  const congelados  = carros.filter(c => c.estado === "congelado");
  const tunelesDisp = tuneles.filter(t => t.activo && t.carros_actuales < t.capacidad_max);
  const carroSel    = carros.find(c => c.id === selCarro);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, paddingBottom:40, maxWidth:1000, margin:"0 auto", width:"100%" }}>

      {/* HEADER */}
      <div style={{ background:"white", borderRadius:12, padding:"10px 14px",
        border:`1px solid ${C.border}`, display:"flex", alignItems:"center",
        justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>

        <div style={{ display:"flex", gap:4 }}>
          {[["activos","Carros"],["historial","Historial"]].map(([v,l])=>(
            <button key={v} onClick={()=>setVista(v)}
              style={{ padding:"7px 14px", border:"none", borderRadius:8,
                background:vista===v?C.blue900:C.blue50,
                color:vista===v?"white":C.blue700,
                fontWeight:700, fontSize:12, cursor:"pointer",
                display:"flex", alignItems:"center", gap:5 }}>
              {v==="historial"&&<History size={12}/>}{l}
              {v==="activos"&&activos.length>0&&(
                <span style={{ background:"white",color:C.blue900,
                  borderRadius:10,padding:"1px 6px",fontSize:11,fontWeight:800 }}>
                  {activos.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {vista==="activos"&&(
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input value={nuevoCod} onChange={e=>setNuevoCod(e.target.value.toUpperCase())}
              placeholder="Código (auto)"
              style={{ ...iS, width:130, fontFamily:"monospace" }}/>
            <button onClick={crearCarro} disabled={ocupado}
              style={{ padding:"8px 14px",
                background:`linear-gradient(135deg,${C.blue900},${C.blue600})`,
                border:"none", borderRadius:9, color:"white", fontWeight:700,
                fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
              <Plus size={13}/> Nuevo carro
            </button>
          </div>
        )}
      </div>

      {/* VISTA ACTIVOS */}
      {vista==="activos"&&(
        <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:12, alignItems:"start" }}>

          {/* columna izq: lista carros */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {activos.length===0&&(
              <div style={{ background:"white", borderRadius:10, padding:24,
                border:`1px dashed ${C.border}`, textAlign:"center",
                fontSize:12, color:C.textMut }}>
                Sin carros activos.<br/>Crea uno arriba.
              </div>
            )}
            {activos.map(c=>{
              const sel = selCarro===c.id;
              const lotes_r = c.lotes_resumen||[];
              const enTunel = c.estado==="en_tunel";
              return (
                <div key={c.id}
                  onClick={()=>{ setSelCarro(sel?null:c.id); setSelLote(""); }}
                  style={{ background:"white", borderRadius:10,
                    border:`2px solid ${sel?C.blue500:C.border}`,
                    padding:"10px 12px", cursor:"pointer",
                    opacity:enTunel?.7:1, transition:"border-color .12s" }}>

                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <strong style={{ fontFamily:"monospace", fontSize:13, color:C.blue900 }}>
                      {c.codigo_carro}
                    </strong>
                    <span style={{ fontSize:10, fontWeight:700,
                      color:enTunel?"#7c3aed":C.blue600,
                      background:enTunel?"#f3e8ff":C.blue50,
                      padding:"2px 7px", borderRadius:6 }}>
                      {enTunel?(c.tunel_nombre||"en túnel"):"cargando"}
                    </span>
                  </div>

                  {lotes_r.length>0&&(
                    <div style={{ marginTop:5, display:"flex", flexWrap:"wrap", gap:3 }}>
                      {lotes_r.map((l,i)=>(
                        <span key={l.lote_id} style={{ fontSize:10, padding:"1px 6px",
                          borderRadius:8, fontWeight:700,
                          background:COLORS[i%COLORS.length]+"20",
                          color:COLORS[i%COLORS.length] }}>
                          {l.codigo} · {l.num_cajas}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop:6, display:"flex",
                    justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:11, color:C.textMut }}>
                      {c.total_cajas||0} cajas · {fmt1(c.kilos_totales)} kg
                    </span>
                    <div style={{ display:"flex", gap:5 }}>
                      {!enTunel&&(c.total_cajas||0)>0&&(
                        <button
                          onClick={e=>{
                            e.stopPropagation();
                            setModalTunel(c);
                            setTemps({t1:"",t2:"",t3:""});
                            setTunelDest("");
                          }}
                          style={{ fontSize:11, fontWeight:700, padding:"3px 9px",
                            background:C.blue900, border:"none", borderRadius:7,
                            color:"white", cursor:"pointer" }}>
                          → Túnel
                        </button>
                      )}
                      {enTunel&&(
                        <button
                          onClick={e=>{
                            e.stopPropagation();
                            setModalCongelar(c);
                            setTempSal("");
                          }}
                          style={{ fontSize:11, fontWeight:700, padding:"3px 9px",
                            background:"#7c3aed", border:"none", borderRadius:7,
                            color:"white", cursor:"pointer",
                            display:"flex", alignItems:"center", gap:3 }}>
                          <Snowflake size={10}/> Congelar
                        </button>
                      )}
                      {!enTunel&&(
                        <button
                          onClick={e=>{ e.stopPropagation(); eliminarCarro(c); }}
                          disabled={ocupado}
                          style={{ fontSize:11, fontWeight:700, padding:"3px 7px",
                            background:"#fee2e2", border:"1px solid #fca5a5",
                            borderRadius:7, color:"#dc2626", cursor:"pointer",
                            display:"flex", alignItems:"center", gap:3 }}>
                          <Trash2 size={10}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* columna der: panel cajas */}
          <div style={{ background:"white", borderRadius:12,
            border:`1px solid ${C.border}`, padding:"14px 16px", minHeight:180 }}>

            {!carroSel?(
              <div style={{ padding:40, textAlign:"center", color:C.textMut, fontSize:13 }}>
                <Boxes size={28} color={C.textMut} style={{ margin:"0 auto 10px", display:"block" }}/>
                Selecciona un carro para agregar cajas
              </div>
            ):carroSel.estado==="en_tunel"?(
              <div style={{ padding:40, textAlign:"center", color:"#7c3aed", fontSize:13, fontWeight:600 }}>
                Este carro ya está en el túnel
              </div>
            ):(
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <strong style={{ fontFamily:"monospace", fontSize:13, color:C.blue900 }}>
                    {carroSel.codigo_carro}
                  </strong>
                  <span style={{ fontSize:12, color:C.textMut }}>— Agregar cajas</span>
                  <select value={selLote}
                    onChange={e=>setSelLote(e.target.value?parseInt(e.target.value):"")}
                    style={{ ...iS, marginLeft:"auto", width:190 }}>
                    <option value="">— Seleccionar lote —</option>
                    {lotes.map(l=><option key={l.id} value={l.id}>{l.codigo}</option>)}
                  </select>
                </div>

                {!selLote?(
                  <div style={{ padding:"20px 0", textAlign:"center",
                    color:C.textMut, fontSize:12 }}>
                    Elige el lote para ver las cajas disponibles
                  </div>
                ):cajasLibres.length===0?(
                  <div style={{ padding:"20px 0", textAlign:"center",
                    color:"#15803d", fontSize:12, fontWeight:600 }}>
                    ✓ Todas las cajas de este lote ya están asignadas
                  </div>
                ):(
                  <>
                    <p style={{ margin:"0 0 8px", fontSize:11, color:C.textMut }}>
                      Haz clic en una caja para asignarla a {carroSel.codigo_carro}
                    </p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {cajasLibres.map(caja=>(
                        <button key={caja.id} onClick={()=>asignarCaja(caja)}
                          style={{ padding:"8px 14px", background:C.blue50,
                            border:`1.5px solid ${C.blue200}`, borderRadius:9,
                            cursor:"pointer", fontFamily:"monospace",
                            fontWeight:700, fontSize:12, color:C.blue900,
                            display:"flex", alignItems:"center", gap:6 }}
                          onMouseEnter={e=>{
                            e.currentTarget.style.background=C.blue100;
                            e.currentTarget.style.borderColor=C.blue500;
                          }}
                          onMouseLeave={e=>{
                            e.currentTarget.style.background=C.blue50;
                            e.currentTarget.style.borderColor=C.blue200;
                          }}>
                          {caja.numero_caja}
                          <span style={{ fontSize:10, color:C.textMut,
                            fontFamily:"inherit", fontWeight:400 }}>
                            {fmt1(caja.kilos_netos)} kg
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* VISTA HISTORIAL */}
      {vista==="historial"&&(
        <div style={{ background:"white", borderRadius:12,
          border:`1px solid ${C.border}`, overflow:"hidden" }}>
          {congelados.length===0?(
            <div style={{ padding:40, textAlign:"center", color:C.textMut, fontSize:13 }}>
              Aún no hay carros congelados
            </div>
          ):(
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:C.blue900 }}>
                  {["","Carro","Túnel","Lotes","Cajas","Kg"].map(h=>(
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left",
                      color:C.blue200, fontSize:11, fontWeight:700,
                      textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {congelados.map((c,ri)=>{
                  const abierto = filaAbierta===c.id;
                  const cajas   = cajasHist[c.id]||[];
                  const bgRow   = ri%2===0?"white":"#f8faff";

                  const toggleFila = async () => {
                    if (abierto) { setFilaAbierta(null); return; }
                    setFilaAbierta(c.id);
                    if (!cajasHist[c.id]) {
                      try {
                        const data = await cajasAPI.listarCarro(c.id);
                        setCajasHist(prev=>({...prev,[c.id]:data}));
                      } catch(e) { onToast(e.message,"error"); }
                    }
                  };

                  return (
                    <>
                      <tr key={c.id}
                        onClick={toggleFila}
                        style={{ borderBottom:abierto?"none":`1px solid ${C.border}`,
                          background:bgRow, cursor:"pointer" }}>
                        <td style={{ padding:"9px 10px 9px 14px", width:28 }}>
                          {abierto
                            ? <ChevronUp size={14} color={C.blue500}/>
                            : <ChevronDown size={14} color={C.textMut}/>}
                        </td>
                        <td style={{ padding:"9px 14px" }}>
                          <strong style={{ fontFamily:"monospace", color:C.blue900 }}>
                            {c.codigo_carro}
                          </strong>
                        </td>
                        <td style={{ padding:"9px 14px", color:C.textSub }}>
                          {c.tunel_nombre||"—"}
                        </td>
                        <td style={{ padding:"9px 14px" }}>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                            {(c.lotes_resumen||[]).map((l,i)=>(
                              <span key={l.lote_id} style={{ fontSize:11, padding:"2px 8px",
                                borderRadius:10, fontWeight:700,
                                background:COLORS[i%COLORS.length]+"15",
                                color:COLORS[i%COLORS.length] }}>
                                {l.codigo} · {l.num_cajas}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding:"9px 14px", fontWeight:700, color:C.blue900 }}>
                          {c.total_cajas||0}
                        </td>
                        <td style={{ padding:"9px 14px", fontWeight:700, color:C.blue900 }}>
                          {fmt1(c.kilos_totales)} kg
                        </td>
                      </tr>
                      {abierto&&(
                        <tr key={`${c.id}-det`}>
                          <td colSpan={6} style={{ background:"#f0f6ff",
                            borderBottom:`1px solid ${C.border}`,
                            padding:"10px 16px 14px" }}>
                            {cajas.length===0?(
                              <span style={{ fontSize:12, color:C.textMut }}>Cargando cajas...</span>
                            ):(
                              <>
                                <p style={{ margin:"0 0 8px", fontSize:11,
                                  fontWeight:700, color:C.blue700 }}>
                                  Cajas en {c.codigo_carro}
                                </p>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                                  {cajas.map((caja,ci)=>{
                                    /* color según el lote */
                                    const lotes_r = c.lotes_resumen||[];
                                    const loteIdx = lotes_r.findIndex(l=>l.lote_id===caja.lote_id);
                                    const col = COLORS[(loteIdx>=0?loteIdx:ci)%COLORS.length];
                                    return (
                                      <div key={caja.id}
                                        style={{ display:"inline-flex", alignItems:"center", gap:6,
                                          padding:"5px 10px", borderRadius:8, background:"white",
                                          border:`1.5px solid ${col}30` }}>
                                        <span style={{ width:7, height:7, borderRadius:"50%",
                                          background:col, flexShrink:0 }}/>
                                        <span style={{ fontFamily:"monospace", fontWeight:700,
                                          fontSize:12, color:C.blue900 }}>{caja.numero_caja}</span>
                                        <span style={{ fontSize:10, color:col, fontWeight:600 }}>
                                          {caja.lote_codigo}
                                        </span>
                                        <span style={{ fontSize:10, color:C.textMut }}>
                                          {fmt1(caja.kilos_netos)} kg
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:C.blue50, borderTop:`2px solid ${C.blue200}` }}>
                  <td colSpan={4} style={{ padding:"9px 14px", fontWeight:700,
                    color:C.blue900 }}>Total — {congelados.length} carros</td>
                  <td style={{ padding:"9px 14px", fontWeight:800, color:C.blue900 }}>
                    {congelados.reduce((s,c)=>s+(c.total_cajas||0),0)}
                  </td>
                  <td style={{ padding:"9px 14px", fontWeight:800, color:C.blue900 }}>
                    {fmt1(congelados.reduce((s,c)=>s+parseFloat(c.kilos_totales||0),0))} kg
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* MODAL TÚNEL */}
      {modalTunel&&(
        <div onClick={e=>{ if(e.target===e.currentTarget) setModalTunel(null); }}
          style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(10,26,74,.75)",
            backdropFilter:"blur(4px)", display:"flex", alignItems:"center",
            justifyContent:"center", padding:20 }}>
          <div style={{ background:"white", borderRadius:18, width:"100%", maxWidth:420,
            boxShadow:"0 30px 80px rgba(0,0,0,.4)" }}>

            <div style={{ padding:"14px 20px",
              background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,
              borderRadius:"18px 18px 0 0",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ color:"white", fontWeight:800, fontSize:14 }}>
                {modalTunel.codigo_carro} → Túnel
              </span>
              <button onClick={()=>setModalTunel(null)}
                style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:8,
                  width:30, height:30, cursor:"pointer", color:"white", fontSize:16 }}>✕</button>
            </div>

            <div style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>
              <p style={{ margin:0, fontSize:12, color:"#92400e", background:"#fff7ed",
                padding:"8px 12px", borderRadius:8, border:"1px solid #fed7aa" }}>
                3 temperaturas del producto antes de ingresar al túnel (obligatorio)
              </p>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[["t1","Muestra 1"],["t2","Muestra 2"],["t3","Muestra 3"]].map(([k,lbl])=>(
                  <div key={k}>
                    <label style={{ display:"block", fontSize:11, color:C.textSub,
                      marginBottom:3 }}>{lbl} °C *</label>
                    <input type="number" step="0.1" value={temps[k]}
                      onChange={e=>setTemps(p=>({...p,[k]:e.target.value}))}
                      placeholder="-18.0"
                      style={{ ...iS, textAlign:"center", fontWeight:700 }}/>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display:"block", fontSize:11, color:C.textSub,
                  marginBottom:3 }}>Túnel *</label>
                <select value={tunelDest} onChange={e=>setTunelDest(e.target.value)} style={iS}>
                  <option value="">— Seleccionar —</option>
                  {tunelesDisp.map(t=>
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({t.carros_actuales}/{t.capacidad_max})
                    </option>
                  )}
                </select>
              </div>
            </div>

            <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}`,
              display:"flex", gap:10, borderRadius:"0 0 18px 18px" }}>
              <button onClick={()=>setModalTunel(null)}
                style={{ flex:1, padding:10, background:"white",
                  border:`1px solid ${C.border}`, borderRadius:10,
                  color:C.textSub, fontWeight:600, cursor:"pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmarTunel}
                disabled={ocupado||!temps.t1||!temps.t2||!temps.t3||!tunelDest}
                style={{ flex:2, padding:10,
                  background:(!temps.t1||!temps.t2||!temps.t3||!tunelDest)?"#e2e8f0":"#15803d",
                  border:"none", borderRadius:10, color:"white", fontWeight:700,
                  cursor:"pointer", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:7 }}>
                {ocupado?"...":"Confirmar — ingresar al túnel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONGELAR */}
      {modalCongelar&&(
        <div onClick={e=>{ if(e.target===e.currentTarget) setModalCongelar(null); }}
          style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(10,26,74,.75)",
            backdropFilter:"blur(4px)", display:"flex", alignItems:"center",
            justifyContent:"center", padding:20 }}>
          <div style={{ background:"white", borderRadius:18, width:"100%", maxWidth:380,
            boxShadow:"0 30px 80px rgba(0,0,0,.4)" }}>

            <div style={{ padding:"14px 20px",
              background:"linear-gradient(135deg,#5b21b6,#7c3aed)",
              borderRadius:"18px 18px 0 0",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ color:"white", fontWeight:800, fontSize:14 }}>
                <Snowflake size={14} style={{ display:"inline", marginRight:6 }}/>
                Congelar — {modalCongelar.codigo_carro}
              </span>
              <button onClick={()=>setModalCongelar(null)}
                style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:8,
                  width:30, height:30, cursor:"pointer", color:"white", fontSize:16 }}>✕</button>
            </div>

            <div style={{ padding:20 }}>
              <p style={{ margin:"0 0 12px", fontSize:12, color:C.textSub }}>
                {modalCongelar.total_cajas||0} cajas · {fmt1(modalCongelar.kilos_totales)} kg
              </p>
              <label style={{ display:"block", fontSize:11, color:C.textSub, marginBottom:4 }}>
                Temperatura de salida °C (opcional)
              </label>
              <input type="number" step="0.1" value={tempSal}
                onChange={e=>setTempSal(e.target.value)}
                placeholder="-22.0" style={{ ...iS, width:160 }}/>
            </div>

            <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}`,
              display:"flex", gap:10, borderRadius:"0 0 18px 18px" }}>
              <button onClick={()=>setModalCongelar(null)}
                style={{ flex:1, padding:10, background:"white",
                  border:`1px solid ${C.border}`, borderRadius:10,
                  color:C.textSub, fontWeight:600, cursor:"pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmarCongelar} disabled={ocupado}
                style={{ flex:2, padding:10, background:"#7c3aed",
                  border:"none", borderRadius:10, color:"white", fontWeight:700,
                  cursor:"pointer", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:7 }}>
                <Snowflake size={13}/>
                {ocupado?"...":"Marcar como congelado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
