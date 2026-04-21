import { useState, useEffect, useCallback } from "react";
import { Plus, Thermometer, Package, Box, ChevronRight, CheckCircle,
         AlertTriangle, Tag, Download, RefreshCw, ArrowRight, Layers } from "lucide-react";
import { tunelesAPI, pesajesAPI, lotesAPI } from "../api/client";
import { C, iS, fmt, fmtFecha } from "../constants/theme";
import { useResponsive } from "../hooks/useResponsive";

/* ─── mini-componentes ─────────────────────────────────────── */
const Badge = ({label,color="blue"}) => {
  const MAP={blue:{bg:C.blue50,text:C.blue700,border:C.blue200},green:{bg:"#dcfce7",text:"#15803d",border:"#a7f3d0"},orange:{bg:"#fff7ed",text:"#c2410c",border:"#fed7aa"},gray:{bg:"#f1f5f9",text:"#64748b",border:"#e2e8f0"},purple:{bg:"#f3e8ff",text:"#7c3aed",border:"#e9d5ff"}};
  const s=MAP[color]||MAP.blue;
  return <span style={{padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:s.bg,color:s.text,border:`1px solid ${s.border}`}}>{label}</span>;
};

const ESTADO_COLOR = {cargando:"blue",listo:"green",en_tunel:"orange",congelado:"purple"};
const ESTADO_LABEL = {cargando:"Cargando",listo:"Listo",en_tunel:"En Túnel",congelado:"Congelado ✅"};

const Modal = ({titulo,onClose,children,wide=false}) => (
  <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
    style={{
      position:"fixed",inset:0,zIndex:200,
      overflowY:"auto",                        /* scroll en el overlay */
      display:"flex",alignItems:"flex-start",   /* empieza desde arriba */
      justifyContent:"center",
      padding:"20px 12px",                      /* espacio top/bottom */
      background:"rgba(10,26,74,.72)",
      backdropFilter:"blur(4px)",
      WebkitOverflowScrolling:"touch",
    }}>
    <div onClick={e=>e.stopPropagation()} style={{
      background:"white",borderRadius:18,width:"100%",
      maxWidth:wide?720:520,
      boxShadow:"0 30px 80px rgba(0,0,0,.45)",
      display:"flex",flexDirection:"column",
      animation:"popIn .22s cubic-bezier(.34,1.56,.64,1) both",
      margin:"auto 0",                          /* centra verticalmente cuando cabe */
    }}>
      <div style={{
        padding:"14px 20px",
        background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,
        display:"flex",justifyContent:"space-between",alignItems:"center",
        borderRadius:"18px 18px 0 0",
        flexShrink:0,
      }}>
        <span style={{color:"white",fontWeight:800,fontSize:14}}>{titulo}</span>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",border:"none",
          borderRadius:8,width:30,height:30,cursor:"pointer",color:"white",fontSize:16,
          display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      <div style={{overflowY:"visible",flex:1,WebkitOverflowScrolling:"touch"}}>{children}</div>
    </div>
    <style>{"@keyframes popIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}"}</style>
  </div>
);

const Btn = ({onClick,icon:Icon,label,color="primary",disabled=false,small=false}) => {
  const COLORS={primary:{bg:C.blue900,text:"white"},success:{bg:"#15803d",text:"white"},danger:{bg:"#dc2626",text:"white"},ghost:{bg:C.blue50,text:C.blue700,border:`1px solid ${C.blue200}`}};
  const s=COLORS[color]||COLORS.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{display:"flex",alignItems:"center",gap:5,padding:small?"5px 10px":"8px 14px",background:disabled?"#e2e8f0":s.bg,border:s.border||"none",borderRadius:9,color:disabled?"#94a3b8":s.text,fontSize:small?11:12,fontWeight:700,cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap"}}>
      {Icon&&<Icon size={small?11:13}/>}{label}
    </button>
  );
};

/* ─── TUNELES.JSX ──────────────────────────────────────────── */
export default function Tuneles({ onToast }) {
  const { isMobile } = useResponsive();
  const [tab,       setTab]     = useState("carros"); // "carros" | "cajas" | "tuneles"
  const [tuneles,   setTuneles] = useState([]);
  const [lotes,     setLotes]   = useState([]);
  const [carros,    setCarros]  = useState([]);
  const [cajas,     setCajas]   = useState([]);
  const [tipos,     setTipos]   = useState([]);
  const [calibres,  setCalibres]= useState([]);
  const [loading,   setLoading] = useState(false);
  const [modal,     setModal]   = useState(null);
  const [selCarro,  setSelCarro]= useState(null);
  const [selCaja,   setSelCaja] = useState(null);
  const [filtLote,  setFiltLote]= useState("");
  const [filtEst,   setFiltEst] = useState("");

  /* ─ formularios ─ */
  const [fCarro, setFC] = useState({codigo_carro:"",niveles:"",observacion:""});
  const [fTunel, setFT] = useState({tunel_id:"",temperatura_ingreso:""});
  const [fSalir, setFS] = useState({temperatura_salida:"",observacion:""});
  const [fTemp,  setFT2]= useState({temp1:"",temp2:"",temp3:"",carro:null}); // pre-túnel
  const [fInv,   setFI] = useState({cantidad_kg:"",cantidad_cajas:""});

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [t,c,ca,tp,cb,ls] = await Promise.all([
        tunelesAPI.listar(),
        tunelesAPI.carros(filtLote?{lote_id:filtLote}:{}),
        tunelesAPI.cajas({}),
        pesajesAPI.tipos(),
        pesajesAPI.calibres(),
        lotesAPI.listar({estado:"en_proceso"}),
      ]);
      setTuneles(t); setCarros(c); setCajas(ca);
      setTipos(tp.filter(x=>!x.es_desecho)); setCalibres(cb); setLotes(ls);
    } catch(e) { onToast(e.message,"error"); }
    setLoading(false);
  },[filtLote]);

  useEffect(()=>{ cargar(); },[cargar]);

  /* ─ acciones ─ */
  const crearCarro = async () => {
    try { await tunelesAPI.crearCarro(fCarro); onToast("Carro creado"); setModal(null); setFC({codigo_carro:"",niveles:"",observacion:""}); cargar(); }
    catch(e){ onToast(e.message,"error"); }
  };

  const abrirMarcarListo = (carro) => {
    setFT2({temp1:"",temp2:"",temp3:"",carro});
    setModal("temperaturas");
  };

  const confirmarMarcarListo = async () => {
    const {temp1,temp2,temp3,carro} = fTemp;
    if(!temp1||!temp2||!temp3) return onToast("Las 3 temperaturas de muestra son obligatorias","error");
    try {
      await tunelesAPI.marcarListo(carro.id,{temp1,temp2,temp3});
      onToast(`✅ Carro ${carro.codigo_carro} listo · T° muestras: ${temp1}°C, ${temp2}°C, ${temp3}°C`);
      setModal(null); cargar();
    } catch(e){ onToast(e.message,"error"); }
  };

  const abrirIngresarTunel = (carro) => {
    setSelCarro(carro);
    setFT({tunel_id:"",temperatura_ingreso:""});
    setModal("ingresar");
  };

  const ingresarTunel = async () => {
    try { await tunelesAPI.ingresarCarro(selCarro.id, fTunel); onToast(`Carro ${selCarro.codigo_carro} ingresado al túnel`); setModal(null); cargar(); }
    catch(e){ onToast(e.message,"error"); }
  };

  const abrirSalir = (carro) => { setSelCarro(carro); setFS({temperatura_salida:"",observacion:""}); setModal("salir"); };

  const sacarTunel = async () => {
    try {
      const r = await tunelesAPI.sacarCarro(selCarro.id, fSalir);
      onToast(r.mensaje||"Carro retirado del túnel ✅");
      setModal(null); cargar();
    } catch(e){ onToast(e.message,"error"); }
  };

  const asignarCaja = async (caja_id, carro_id) => {
    try { await tunelesAPI.asignarCaja(caja_id,{carro_id}); onToast("Caja asignada al carro"); cargar(); }
    catch(e){ onToast(e.message,"error"); }
  };

  const desasignarCaja = async (caja_id) => {
    try { await tunelesAPI.asignarCaja(caja_id,{carro_id:null}); onToast("Caja desasignada"); cargar(); }
    catch(e){ onToast(e.message,"error"); }
  };

  const abrirInventario = (carro) => {
    const cajasCarro = cajas.filter(ca=>ca.carro_id===carro.id);
    const kgTotal = cajasCarro.reduce((s,ca)=>s+parseFloat(ca.kilos_netos||0),0);
    setSelCarro(carro);
    setFI({cantidad_kg:kgTotal.toFixed(2), cantidad_cajas:cajasCarro.length});
    setModal("inventario");
  };

  const registrarInventario = async () => {
    // Abrir pantalla de inventario — pasamos datos para pre-rellenar
    onToast("Ve a Inventario y registra el ingreso de este carro","info");
    setModal(null);
  };

  const verEtiquetaCarro = async (id) => {
    try {
      const html = await tunelesAPI.etiquetaCarro(id);
      const w = window.open("","_blank","width=800,height=600");
      w.document.write(html); w.document.close();
    } catch(e){ onToast(e.message,"error"); }
  };

  // Imprimir TODAS las etiquetas de un carro de una vez
  const imprimirEtiquetasCarro = async (carro_id, codigo_carro) => {
    try {
      onToast(`Preparando etiquetas del carro ${codigo_carro}...`,"info");
      const html = await tunelesAPI.etiquetasZebraCarro(carro_id);
      const w = window.open("","_blank","width=600,height=700");
      w.document.write(html);
      w.document.close();
    } catch(e){ onToast(e.message,"error"); }
  };

  // Imprimir TODAS las etiquetas de un lote de una vez
  const imprimirEtiquetasLote = async (lote_id, codigo_lote) => {
    try {
      onToast(`Preparando etiquetas del lote ${codigo_lote}...`,"info");
      const html = await tunelesAPI.etiquetasZebraLote(lote_id);
      const w = window.open("","_blank","width=600,height=700");
      w.document.write(html);
      w.document.close();
    } catch(e){ onToast(e.message,"error"); }
  };

  const verEtiquetaZebra = async (id) => {
    try {
      const html = await tunelesAPI.etiquetaZebra(id);
      const w = window.open("","_blank","width=420,height=460,left=100,top=100");
      w.document.write(html); w.document.close();
    } catch(e){ onToast(e.message,"error"); }
  };

  const verEtiquetaCaja = async (id) => {
    try {
      const html = await tunelesAPI.etiquetaCaja(id);
      const w = window.open("","_blank","width=500,height=400");
      w.document.write(html); w.document.close();
    } catch(e){ onToast(e.message,"error"); }
  };

  /* ─ filtros ─ */
  const carrosFiltrados = carros.filter(c=>
    (!filtEst || c.estado===filtEst)
  );
  const cajasLibres = cajas.filter(ca=>!ca.carro_id);
  const cajasAsignadas = cajas.filter(ca=>ca.carro_id);

  /* ─ KPIs ─ */
  const kpiCarros = {cargando:carros.filter(c=>c.estado==="cargando").length,listo:carros.filter(c=>c.estado==="listo").length,en_tunel:carros.filter(c=>c.estado==="en_tunel").length,congelado:carros.filter(c=>c.estado==="congelado").length};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
        {[
          {l:"Cargando",v:kpiCarros.cargando,c:"blue"},
          {l:"Listos",v:kpiCarros.listo,c:"green"},
          {l:"En Túnel",v:kpiCarros.en_tunel,c:"orange"},
          {l:"Congelados",v:kpiCarros.congelado,c:"purple"},
          {l:"Cajas Libres",v:cajasLibres.length,c:"gray"},
          {l:"Total Cajas",v:cajas.length,c:"gray"},
        ].map(({l,v,c})=>(
          <div key={l} style={{background:"white",borderRadius:12,border:`1px solid ${C.border}`,padding:"12px 14px",textAlign:"center"}}>
            <p style={{fontSize:9,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:.5}}>{l}</p>
            <p style={{fontSize:24,fontWeight:900,color:C.blue900,marginTop:2}}>{v}</p>
          </div>
        ))}
      </div>

      {/* Tabs + botones */}
      <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden"}}>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:"#f8faff"}}>
          {[{id:"carros",l:"Carros"},,,{id:"cajas",l:"Cajas"},,{id:"tuneles",l:"Estado Túneles"}].filter(Boolean).map(({id,l})=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"12px 8px",border:"none",background:"none",borderBottom:`2px solid ${tab===id?C.blue600:"transparent"}`,color:tab===id?C.blue700:C.textMut,fontWeight:tab===id?700:500,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              {l}
            </button>
          ))}
        </div>

        {/* ── TAB CARROS ─────────────────────────────────────── */}
        {tab==="carros" && (
          <div style={{padding:14}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              <select value={filtEst} onChange={e=>setFiltEst(e.target.value)} style={{...iS,width:"auto",fontSize:12}}>
                <option value="">Todos los estados</option>
                <option value="cargando">Cargando</option>
                <option value="listo">Listos</option>
                <option value="en_tunel">En Túnel</option>
                <option value="congelado">Congelados</option>
              </select>
              <Btn onClick={()=>{setFC({codigo_carro:"",niveles:"",observacion:""});setModal("carro");}} icon={Plus} label="Nuevo Carro"/>
              <Btn onClick={()=>tunelesAPI.exportarExcel({})} icon={Download} label="Excel" color="ghost"/>
              <button onClick={cargar} style={{padding:"8px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center"}}><RefreshCw size={14} color={C.blue600}/></button>
            </div>

            {carrosFiltrados.length===0&&<p style={{textAlign:"center",color:C.textMut,padding:"40px 0"}}>Sin carros</p>}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {carrosFiltrados.map(carro=>{
                const cajasCarro = cajas.filter(ca=>ca.carro_id===carro.id);
                const pendInv = cajasCarro.filter(ca=>!ca.en_inventario).length;
                const lotesResumen = carro.lotes_resumen || [];
                const LOTE_COLORS=["#2563eb","#16a34a","#9333ea","#dc2626","#d97706","#0891b2"];
                return (
                  <div key={carro.id} style={{border:`1.5px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                    {/* Header carro */}
                    <div style={{padding:"10px 14px",background:C.blue50,display:"flex",alignItems:"center",flexWrap:"wrap",gap:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                        <div style={{width:36,height:36,borderRadius:10,background:C.blue900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{color:"white",fontWeight:900,fontSize:11}}>{carro.codigo_carro}</span>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontWeight:800,fontSize:14,color:C.blue900}}>{carro.codigo_carro}{carro.niveles?<span style={{fontWeight:400,fontSize:11,color:C.textMut}}> · {carro.niveles} niv.</span>:""}</p>
                          {/* Desglose por lote */}
                          {lotesResumen.length>0?(
                            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:3}}>
                              {lotesResumen.map((l,i)=>{
                                const color=LOTE_COLORS[i%LOTE_COLORS.length];
                                return (
                                  <span key={l.lote_id} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 7px",borderRadius:12,background:color+"15",border:`1px solid ${color}30`,fontSize:11}}>
                                    <span style={{width:6,height:6,borderRadius:"50%",background:color,flexShrink:0}}/>
                                    <strong style={{color}}>{l.codigo}</strong>
                                    <span style={{color:C.textMut}}>{l.num_cajas} caj · {parseFloat(l.kg).toFixed(1)}kg</span>
                                  </span>
                                );
                              })}
                            </div>
                          ):(
                            <p style={{fontSize:11,color:C.textMut,margin:0}}>Sin cajas asignadas</p>
                          )}
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                        <Badge label={ESTADO_LABEL[carro.estado]} color={ESTADO_COLOR[carro.estado]}/>
                        <span style={{fontSize:11,color:C.textSub}}><strong>{carro.total_cajas||0}</strong> cajas · <strong>{fmt(carro.kilos_totales)}</strong> kg</span>
                      </div>
                    </div>
                    {/* Cajas del carro */}
                    {cajasCarro.length>0&&(
                      <div style={{padding:"8px 14px",display:"flex",flexWrap:"wrap",gap:5}}>
                        {cajasCarro.map(ca=>(
                          <div key={ca.id} title={`${ca.numero_caja} — ${ca.producto_tipo_nombre} ${ca.calibre_nombre||""} — ${ca.kilos_netos} kg`}
                            style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",background:ca.en_inventario?"#dcfce7":"white",border:`1px solid ${ca.en_inventario?"#a7f3d0":C.border}`,borderRadius:7,fontSize:11,cursor:"pointer"}}
                            onClick={()=>verEtiquetaCaja(ca.id)}>
                            <Tag size={9} color={ca.en_inventario?"#15803d":C.blue500}/>
                            <span style={{fontFamily:"monospace",fontWeight:700,color:ca.en_inventario?"#15803d":C.blue900}}>{ca.numero_caja}</span>
                            <span style={{color:C.textMut,fontSize:10}}>{parseFloat(ca.kilos_netos).toFixed(1)}kg</span>
                            <button onClick={e=>{e.stopPropagation();desasignarCaja(ca.id);}} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:11,padding:0,marginLeft:2}}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Acciones */}
                    <div style={{padding:"8px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:6,flexWrap:"wrap"}}>
                      <Btn onClick={()=>verEtiquetaCarro(carro.id)} icon={Tag} label="Etiqueta" color="ghost" small/>
                      <Btn onClick={()=>imprimirEtiquetasCarro(carro.id, carro.codigo_carro)} icon={Tag} label={`🦓 Todas (${cajasCarro.length})`} color="ghost" small/>
                      {carro.estado==="cargando"&&<Btn onClick={()=>abrirMarcarListo(carro)} icon={CheckCircle} label="Marcar Listo" color="success" small disabled={cajasCarro.length===0}/>}
                      {carro.estado==="listo"&&<Btn onClick={()=>abrirIngresarTunel(carro)} icon={Thermometer} label="Ingresar a Túnel" color="primary" small/>}
                      {carro.estado==="en_tunel"&&<Btn onClick={()=>abrirSalir(carro)} icon={CheckCircle} label="Sacar del Túnel" color="success" small/>}
                      {carro.estado==="congelado"&&pendInv>0&&(
                        <span style={{fontSize:11,color:"#c2410c",display:"flex",alignItems:"center",gap:4}}><AlertTriangle size={11}/>{pendInv} cajas pendientes en inventario</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB CAJAS ─────────────────────────────────────── */}
        {tab==="cajas" && (
          <div style={{padding:14}}>
            <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
              <div style={{background:"#fff7ed",borderRadius:10,padding:"8px 12px",border:"1px solid #fed7aa",display:"flex",alignItems:"center",gap:6}}>
                <AlertTriangle size={14} color="#c2410c"/>
                <span style={{fontSize:12,fontWeight:700,color:"#c2410c"}}>{cajasLibres.length} cajas sin asignar a carro</span>
              </div>
              <div style={{background:"#dcfce7",borderRadius:10,padding:"8px 12px",border:"1px solid #a7f3d0",display:"flex",alignItems:"center",gap:6}}>
                <CheckCircle size={14} color="#15803d"/>
                <span style={{fontSize:12,fontWeight:700,color:"#15803d"}}>{cajasAsignadas.length} cajas asignadas</span>
              </div>
            </div>

            {/* Cajas libres */}
            {cajasLibres.length>0&&(
              <>
                <p style={{fontWeight:700,fontSize:13,color:C.blue900,marginBottom:8}}>Cajas sin carro asignado</p>
                <div style={{overflowX:"auto",marginBottom:16}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr style={{background:C.blue900}}>
                      {["N° Caja","Lote","Producto","Calibre","Kg","Asignar a Carro",""].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:C.blue300}}>{h.toUpperCase()}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {cajasLibres.map(ca=>(
                        <tr key={ca.id} style={{borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:"8px 10px",fontFamily:"monospace",fontWeight:700,color:C.blue900}}>{ca.numero_caja}</td>
                          <td style={{padding:"8px 10px",color:C.textSub}}>{ca.lote_codigo}</td>
                          <td style={{padding:"8px 10px",color:C.text}}>{ca.producto_tipo_nombre}</td>
                          <td style={{padding:"8px 10px",color:C.textSub}}>{ca.calibre_nombre||"—"}</td>
                          <td style={{padding:"8px 10px",fontWeight:700}}>{parseFloat(ca.kilos_netos).toFixed(2)}</td>
                          <td style={{padding:"8px 10px"}}>
                            <select onChange={e=>{ if(e.target.value) asignarCaja(ca.id,+e.target.value); e.target.value=""; }}
                              defaultValue="" style={{...iS,fontSize:11,padding:"4px 8px",minWidth:140}}>
                              <option value="">— Seleccionar carro —</option>
                              {carros.filter(c=>c.estado==="cargando"||c.estado==="listo").map(c=>(
                                <option key={c.id} value={c.id}>{c.codigo_carro}{c.lotes_codigos?` (${c.lotes_codigos})`:""}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{padding:"8px 10px"}}>
                            <button onClick={()=>verEtiquetaCaja(ca.id)} style={{display:"flex",alignItems:"center",gap:3,padding:"4px 8px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:6,color:C.blue700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}><Tag size={10}/>Etiqueta</button>
                            <button onClick={()=>verEtiquetaZebra(ca.id)} style={{display:"flex",alignItems:"center",gap:3,padding:"4px 8px",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:6,color:"#92400e",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700}} title="Etiqueta Zebra 10×10 bilingüe">🦓 Zebra</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Resumen por carro */}
            <p style={{fontWeight:700,fontSize:13,color:C.blue900,marginBottom:8}}>Cajas por carro</p>
            {carros.filter(c=>cajas.some(ca=>ca.carro_id===c.id)).map(carro=>{
              const cajasCarro = cajas.filter(ca=>ca.carro_id===carro.id);
              return (
                <details key={carro.id} style={{marginBottom:8,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
                  <summary style={{padding:"10px 14px",cursor:"pointer",background:C.blue50,fontWeight:700,fontSize:13,color:C.blue900,display:"flex",alignItems:"center",gap:8}}>
                    <span style={{background:C.blue900,color:"white",borderRadius:6,padding:"2px 8px",fontFamily:"monospace",fontSize:12}}>{carro.codigo_carro}</span>
                    <Badge label={ESTADO_LABEL[carro.estado]} color={ESTADO_COLOR[carro.estado]}/>
                    <span style={{marginLeft:"auto",color:C.textMut,fontSize:12}}>{cajasCarro.length} cajas · {fmt(cajasCarro.reduce((s,c)=>s+parseFloat(c.kilos_netos||0),0))} kg</span>
                  </summary>
                  <div style={{padding:10,display:"flex",flexWrap:"wrap",gap:6}}>
                    {cajasCarro.map(ca=>(
                      <div key={ca.id} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:ca.en_inventario?"#dcfce7":"white",border:`1px solid ${ca.en_inventario?"#a7f3d0":C.border}`,borderRadius:8,fontSize:11}}>
                        <Tag size={10} color={ca.en_inventario?"#15803d":C.blue500}/>
                        <span style={{fontFamily:"monospace",fontWeight:700}}>{ca.numero_caja}</span>
                        <span style={{color:C.textMut}}>{ca.producto_tipo_nombre} {ca.calibre_nombre||""} — {parseFloat(ca.kilos_netos).toFixed(2)}kg</span>
                        {ca.en_inventario&&<span style={{color:"#15803d",fontSize:10}}>✅</span>}
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        {/* ── TAB TUNELES ───────────────────────────────────── */}
        {tab==="tuneles" && (
          <div style={{padding:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
            {tuneles.map(t=>{
              const pct = Math.round((t.carros_actuales/t.capacidad_max)*100);
              const color = pct>=90?"#dc2626":pct>=70?"#f59e0b":"#15803d";
              return (
                <div key={t.id} style={{background:"white",borderRadius:14,border:`2px solid ${pct>=90?"#fca5a5":C.border}`,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Thermometer size={18} color={C.blue600}/>
                      <span style={{fontWeight:800,fontSize:15,color:C.blue900}}>{t.nombre}</span>
                    </div>
                    {pct>=90&&<AlertTriangle size={16} color="#dc2626"/>}
                  </div>
                  <div style={{background:"#f1f5f9",borderRadius:8,height:10,marginBottom:8,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:color,borderRadius:8,transition:"width .4s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                    <span style={{color:C.textMut}}>Carros</span>
                    <span style={{fontWeight:800,color:color}}>{t.carros_actuales} / {t.capacidad_max}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:4}}>
                    <span style={{color:C.textMut}}>Cajas dentro</span>
                    <span style={{fontWeight:700,color:C.blue900}}>{t.cajas_en_tunel||0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal crear carro */}
      {modal==="carro"&&(
        <Modal titulo="Nuevo Carro" onClose={()=>setModal(null)}>
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <div><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:6}}>Código del Carro <span style={{fontSize:10,fontWeight:400,color:C.textMut}}>(dejar vacío = auto C-001)</span></label>
              <input value={fCarro.codigo_carro} onChange={e=>setFC(p=>({...p,codigo_carro:e.target.value.toUpperCase()}))} placeholder="C-001 (auto si vacío)" style={{...iS,fontFamily:"monospace",letterSpacing:1}}/></div>
            <div><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:6}}>Niveles (1-10)</label>
              <input type="number" min="1" max="10" value={fCarro.niveles} onChange={e=>setFC(p=>({...p,niveles:e.target.value}))} placeholder="Ej: 8" style={iS}/></div>
            <div><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:6}}>Observación</label>
              <input value={fCarro.observacion} onChange={e=>setFC(p=>({...p,observacion:e.target.value}))} style={iS}/></div>
          </div>
          <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,background:C.blue50,display:"flex",gap:10}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:"10px",background:"white",border:`1px solid ${C.border}`,borderRadius:10,color:C.textSub,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
            <button onClick={crearCarro} style={{flex:2,padding:"10px",background:`linear-gradient(135deg,${C.blue900},${C.blue600})`,border:"none",borderRadius:10,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Crear Carro</button>
          </div>
        </Modal>
      )}

      {/* Modal ingresar al túnel */}
      {modal==="ingresar"&&selCarro&&(
        <Modal titulo={`Ingresar ${selCarro.codigo_carro} al Túnel`} onClose={()=>setModal(null)}>
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:C.blue50,borderRadius:10,padding:12,border:`1px solid ${C.blue100}`}}>
              <p style={{fontSize:12,color:C.textSub}}>Carro: <strong style={{color:C.blue900}}>{selCarro.codigo_carro}</strong></p>
              <p style={{fontSize:12,color:C.textSub}}>Cajas: <strong>{selCarro.total_cajas}</strong> · Kg: <strong>{fmt(selCarro.kilos_totales)}</strong></p>
            </div>
            <div><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:6}}>Túnel *</label>
              <select value={fTunel.tunel_id} onChange={e=>setFT(p=>({...p,tunel_id:e.target.value}))} style={iS}>
                <option value="">— Seleccionar túnel —</option>
                {tuneles.filter(t=>t.activo&&t.carros_actuales<t.capacidad_max).map(t=>(
                  <option key={t.id} value={t.id}>{t.nombre} ({t.carros_actuales}/{t.capacidad_max})</option>
                ))}
              </select></div>
            <div><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:6}}>Temperatura de Ingreso (°C)</label>
              <input type="number" step="0.1" value={fTunel.temperatura_ingreso} onChange={e=>setFT(p=>({...p,temperatura_ingreso:e.target.value}))} placeholder="-18.0" style={iS}/></div>
          </div>
          <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,background:C.blue50,display:"flex",gap:10}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:"10px",background:"white",border:`1px solid ${C.border}`,borderRadius:10,color:C.textSub,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
            <button onClick={ingresarTunel} disabled={!fTunel.tunel_id} style={{flex:2,padding:"10px",background:!fTunel.tunel_id?"#e2e8f0":"#15803d",border:"none",borderRadius:10,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Ingresar al Túnel</button>
          </div>
        </Modal>
      )}

      {/* Modal sacar del túnel */}
      {modal==="salir"&&selCarro&&(
        <Modal titulo={`Retirar ${selCarro.codigo_carro} del Túnel`} onClose={()=>setModal(null)}>
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fff7ed",borderRadius:10,padding:12,border:"1px solid #fed7aa"}}>
              <p style={{fontSize:12,color:"#c2410c",fontWeight:700}}>⚠️ El carro quedará como CONGELADO</p>
              <p style={{fontSize:11,color:C.textMut,marginTop:4}}>Las cajas deberán ingresarse al inventario manualmente en el módulo de Inventario</p>
            </div>
            <div><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:6}}>Temperatura de Salida (°C)</label>
              <input type="number" step="0.1" value={fSalir.temperatura_salida} onChange={e=>setFS(p=>({...p,temperatura_salida:e.target.value}))} placeholder="-22.0" style={iS}/></div>
            <div><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:6}}>Observación</label>
              <textarea rows={2} value={fSalir.observacion} onChange={e=>setFS(p=>({...p,observacion:e.target.value}))} style={{...iS,resize:"none"}}/></div>
          </div>
          <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,background:C.blue50,display:"flex",gap:10}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:"10px",background:"white",border:`1px solid ${C.border}`,borderRadius:10,color:C.textSub,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
            <button onClick={sacarTunel} style={{flex:2,padding:"10px",background:"#7c3aed",border:"none",borderRadius:10,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✅ Marcar como Congelado</button>
          </div>
        </Modal>
      )}
      {/* Modal 3 temperaturas pre-túnel */}
      {modal==="temperaturas"&&fTemp.carro&&(
        <Modal titulo={`Temperaturas de Muestra — ${fTemp.carro.codigo_carro}`} onClose={()=>setModal(null)}>
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fff7ed",borderRadius:10,padding:12,border:"1px solid #fed7aa",display:"flex",gap:8,alignItems:"flex-start"}}>
              <Thermometer size={16} color="#c2410c" style={{marginTop:2,flexShrink:0}}/>
              <div>
                <p style={{fontWeight:700,fontSize:12,color:"#c2410c"}}>Toma de muestra obligatoria antes del túnel</p>
                <p style={{fontSize:11,color:"#92400e",marginTop:3}}>Registrar 3 mediciones de temperatura del producto antes de ingresar al túnel. Plan n=3; A=0; R=1 según NCh44 Of 78.</p>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              {[{k:"temp1",l:"Muestra 1 (°C)"},{k:"temp2",l:"Muestra 2 (°C)"},{k:"temp3",l:"Muestra 3 (°C)"}].map(({k,l})=>(
                <div key={k}>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:5}}>{l} *</label>
                  <input type="number" step="0.1"
                    value={fTemp[k]}
                    onChange={e=>setFT2(p=>({...p,[k]:e.target.value}))}
                    placeholder="-18.0"
                    style={{...iS,textAlign:"center",fontWeight:700,fontSize:14,
                      borderColor:fTemp[k]&&parseFloat(fTemp[k])>-18?"#f59e0b":undefined,
                      color:fTemp[k]&&parseFloat(fTemp[k])>-18?"#b45309":undefined}}/>
                  {fTemp[k]&&parseFloat(fTemp[k])>-18&&(
                    <p style={{fontSize:9,color:"#b45309",marginTop:2}}>⚠ Sobre -18°C</p>
                  )}
                </div>
              ))}
            </div>
            {fTemp.temp1&&fTemp.temp2&&fTemp.temp3&&(
              <div style={{background:C.blue50,borderRadius:10,padding:"8px 14px",display:"flex",gap:16,alignItems:"center"}}>
                <p style={{fontSize:12,color:C.textSub}}>Promedio:</p>
                <p style={{fontWeight:800,fontSize:14,color:C.blue900}}>
                  {((parseFloat(fTemp.temp1)+parseFloat(fTemp.temp2)+parseFloat(fTemp.temp3))/3).toFixed(1)}°C
                </p>
              </div>
            )}
          </div>
          <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,background:C.blue50,display:"flex",gap:10}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:"10px",background:"white",border:`1px solid ${C.border}`,borderRadius:10,color:C.textSub,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
            <button onClick={confirmarMarcarListo}
              disabled={!fTemp.temp1||!fTemp.temp2||!fTemp.temp3}
              style={{flex:2,padding:"10px",background:(!fTemp.temp1||!fTemp.temp2||!fTemp.temp3)?"#e2e8f0":"#15803d",border:"none",borderRadius:10,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              ✅ Confirmar — Marcar Listo para Túnel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
