import { useState, useEffect } from "react";
import { ArrowDown, ArrowUp, RefreshCw, Boxes, Truck, Lock, Info } from "lucide-react";
import { inventarioAPI, tunelesAPI, pesajesAPI } from "../api/client";
import { C, iS, fmt, fmtFecha, fmtDecimal } from "../constants/theme";

/* ── Modal genérico ─────────────────────────────────────────── */
const Modal = ({titulo,onClose,children}) => (
  <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
    style={{
      position:"fixed",inset:0,zIndex:200,
      overflowY:"auto",
      display:"flex",alignItems:"flex-start",
      justifyContent:"center",
      padding:"20px 12px",
      background:"rgba(10,26,74,.72)",
      backdropFilter:"blur(4px)",
      WebkitOverflowScrolling:"touch",
    }}>
    <div onClick={e=>e.stopPropagation()} style={{
      background:"white",borderRadius:18,width:"100%",maxWidth:540,
      boxShadow:"0 30px 80px rgba(0,0,0,.45)",
      display:"flex",flexDirection:"column",
      animation:"popIn .22s cubic-bezier(.34,1.56,.64,1) both",
      margin:"auto 0",
    }}>
      <div style={{
        padding:"14px 20px",
        background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,
        display:"flex",justifyContent:"space-between",alignItems:"center",
        borderRadius:"18px 18px 0 0",flexShrink:0,
      }}>
        <span style={{color:"white",fontWeight:800,fontSize:14}}>{titulo}</span>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",border:"none",
          borderRadius:8,width:30,height:30,cursor:"pointer",color:"white",fontSize:16,
          display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      <div>{children}</div>
    </div>
    <style>{"@keyframes popIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}"}</style>
  </div>
);
const F = ({label,children,req=false}) => (
  <div>
    <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,
      textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>
      {label}{req&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}
    </label>
    {children}
  </div>
);

export default function Inventario({ onToast }) {
  const [items,    setItems]   = useState([]);
  const [movs,     setMovs]    = useState([]);
  const [carros,   setCarros]  = useState([]);
  const [tipos,    setTipos]   = useState([]);
  const [calibres, setCalib]   = useState([]);
  const [tab,      setTab]     = useState("stock");
  const [modal,    setModal]   = useState(null);
  const [selItem,  setSel]     = useState(null);
  const [cargando, setCarg]    = useState(false);
  const [tuneles,  setTuneles] = useState([]);
  const [statsCarros, setStatsC] = useState(null);

  // Form movimiento
  const [fMov, setFM] = useState({tipo:"entrada",cantidad_kg:"",cantidad_cajas:"",motivo:"",documento:""});

  // Form carro — con datos exactos del backend
  const [fCarro,    setFCarr]   = useState({carro_id:"",producto_tipo_id:"",calibre_id:""});
  const [resumen,   setResumen] = useState(null); // datos exactos del carro
  const [cargandoC, setCargC]   = useState(false);

  const cargar = async () => {
    setCarg(true);
    try {
      const [inv, mv, cr, tp, cb, tun, stats] = await Promise.all([
        inventarioAPI.listar({categoria_inv:"producto"}),
        inventarioAPI.movimientos({limite:100}),
        tunelesAPI.carros({estado:"congelado"}),
        pesajesAPI.tipos(),
        pesajesAPI.calibres(),
        tunelesAPI.listar(),
        tunelesAPI.estadoCarros(),
      ]);
      setItems(inv); setMovs(mv); setCarros(cr);
      setTipos(tp.filter(x=>!x.es_desecho)); setCalib(cb);
      setTuneles(tun); setStatsC(stats);
    } catch(e){ onToast(e.message,"error"); }
    setCarg(false);
  };

  useEffect(()=>{ cargar(); },[]);

  // Cuando se selecciona un carro, consultar kg exactos
  const seleccionarCarro = async (carro_id) => {
    setFCarr(p=>({...p,carro_id,producto_tipo_id:"",calibre_id:""}));
    setResumen(null);
    if (!carro_id) return;
    setCargC(true);
    try {
      const r = await inventarioAPI.resumenCarro(carro_id);
      setResumen(r);
      // Si hay un solo tipo de producto, preseleccionar
      if (r.desglose?.length === 1) {
        setFCarr(p=>({...p,
          producto_tipo_id: String(r.desglose[0].producto_tipo_id),
          calibre_id: r.desglose[0].calibre_id ? String(r.desglose[0].calibre_id) : "",
        }));
      }
    } catch(e){ onToast("No se pudo obtener el resumen del carro","error"); }
    setCargC(false);
  };

  const abrirMovimiento = (item) => {
    setSel(item);
    setFM({tipo:"entrada",cantidad_kg:"",cantidad_cajas:"",motivo:"",documento:""});
    setModal("movimiento");
  };

  const registrarMovimiento = async () => {
    try {
      await inventarioAPI.registrarMovimiento(selItem.id, fMov);
      onToast(fMov.tipo==="entrada"?"Entrada registrada ✓":"Salida registrada ✓");
      setModal(null); cargar();
    } catch(e){ onToast(e.message,"error"); }
  };

  const registrarCarro = async () => {
    if (!fCarro.carro_id) return onToast("Selecciona un carro","error");
    if (!fCarro.producto_tipo_id) return onToast("Selecciona el tipo de producto","error");
    if (!resumen) return onToast("Espera a que carguen los datos del carro","error");

    try {
      // Los kg y cajas vienen del backend directamente (carro_id)
      const result = await inventarioAPI.crear({
        carro_id:         +fCarro.carro_id,
        lote_id:          resumen.lote_id,
        producto_tipo_id: +fCarro.producto_tipo_id,
        calibre_id:       fCarro.calibre_id ? +fCarro.calibre_id : null,
        categoria_inv:    "producto",
        // kg y cajas serán calculados exactamente en el backend desde las cajas del carro
        kilos_disponibles: resumen.kg_total_exacto,
        num_cajas:         resumen.total_cajas,
      });

      onToast(
        `✅ Carro registrado: ${fmtDecimal(result.kg_ingresado||resumen.kg_total_exacto)} kg exactos · ${result.cajas_ingresadas||resumen.total_cajas} cajas`
      );
      setModal(null);
      setFCarr({carro_id:"",producto_tipo_id:"",calibre_id:""});
      setResumen(null);
      cargar();
    } catch(e){ onToast(e.message,"error"); }
  };

  // KPIs
  const totalKg    = items.reduce((s,i)=>s+parseFloat(i.kilos_disponibles||0),0);
  const totalCajas = items.reduce((s,i)=>s+parseInt(i.num_cajas||0),0);
  // Solo carros que aún NO tienen todas sus cajas en inventario
  const carrosPendientes = carros.filter(c=>(c.cajas_inventariadas||0)<(c.total_cajas||1));

  const desgloseResumen = resumen?.desglose?.filter(d=>d.cajas>0) || [];
  const desgloseSel = fCarro.producto_tipo_id
    ? desgloseResumen.find(d=>
        String(d.producto_tipo_id)===fCarro.producto_tipo_id &&
        String(d.calibre_id||"")===String(fCarro.calibre_id||"")
      )
    : null;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
        {[
          {l:"Kg Disponibles",    v:`${fmtDecimal(totalKg)} kg`, c:C.blue900},
          {l:"Cajas en Stock",    v:totalCajas,                   c:"#15803d"},
          {l:"Cajas en Túneles",  v:statsCarros?.cajas?.asignadas||0, c:"#7c3aed"},
          {l:"Carros en Túnel",   v:statsCarros?.carros?.en_tunel||0, c:"#d97706"},
        ].map(({l,v,c})=>(
          <div key={l} style={{background:"white",borderRadius:12,border:`1px solid ${C.border}`,padding:"12px 14px",textAlign:"center"}}>
            <p style={{fontSize:9,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:.5}}>{l}</p>
            <p style={{fontSize:22,fontWeight:900,color:c,marginTop:2}}>{v}</p>
          </div>
        ))}
      </div>

      {/* Panel Túneles Activos */}
      {tuneles.some(t=>t.carros_actuales>0)&&(
        <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:"12px 16px"}}>
          <p style={{fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
            <Lock size={13}/> Túneles en Proceso
          </p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8}}>
            {tuneles.map(t=>{
              const pct = t.capacidad_max>0 ? Math.round((t.carros_actuales/t.capacidad_max)*100) : 0;
              const activo = t.carros_actuales>0;
              return (
                <div key={t.id} style={{borderRadius:10,border:`1.5px solid ${activo?"#a5b4fc":"#e2e8f0"}`,
                  padding:"10px 12px",background:activo?"#eef2ff":"#f8faff"}}>
                  <p style={{fontSize:12,fontWeight:800,color:activo?"#3730a3":C.textMut}}>{t.nombre}</p>
                  <p style={{fontSize:22,fontWeight:900,color:activo?"#4f46e5":"#94a3b8",margin:"2px 0"}}>{t.cajas_en_tunel||0}</p>
                  <p style={{fontSize:10,color:activo?"#6366f1":"#94a3b8"}}>cajas · {t.carros_actuales}/{t.capacidad_max} carros</p>
                  <div style={{marginTop:6,height:4,borderRadius:4,background:"#e0e7ff",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:pct>80?"#dc2626":pct>50?"#d97706":"#4f46e5",borderRadius:4,transition:"width .3s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aviso carros pendientes de inventario manual (solo los no auto-inventariados) */}
      {carrosPendientes.length>0&&(
        <div style={{background:"#fef3c7",borderRadius:12,padding:"10px 16px",border:"1px solid #fcd34d",
          display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}
          onClick={()=>{setFCarr({carro_id:"",producto_tipo_id:"",calibre_id:""});setResumen(null);setModal("carro");}}>
          <Truck size={16} color="#92400e"/>
          <span style={{fontSize:13,fontWeight:700,color:"#92400e",flex:1}}>
            {carrosPendientes.length} carro{carrosPendientes.length>1?"s":""} congelado{carrosPendientes.length>1?"s":""} pendiente{carrosPendientes.length>1?"s":""} de inventario
          </span>
          <span style={{fontSize:12,color:"#b45309",fontWeight:600,flexShrink:0}}>Registrar →</span>
        </div>
      )}

      {/* Panel principal */}
      <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",
          borderBottom:`1px solid ${C.border}`,background:"#f8faff"}}>
          <Boxes size={16} color={C.blue600}/>
          <span style={{fontWeight:700,fontSize:14,color:C.blue900,flex:1}}>Inventario de Producto</span>
          {carrosPendientes.length>0&&(
            <button onClick={()=>{setFCarr({carro_id:"",producto_tipo_id:"",calibre_id:""});setResumen(null);setModal("carro");}}
              style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",background:"#7c3aed",border:"none",
                borderRadius:9,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              <Truck size={12}/> Registrar Carro ({carrosPendientes.length})
            </button>
          )}
          <button onClick={cargar} style={{padding:"8px",background:C.blue50,border:`1px solid ${C.blue200}`,
            borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center"}}>
            <RefreshCw size={14} color={C.blue600}/>
          </button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
          {[{id:"stock",l:"Stock"},{id:"movimientos",l:"Movimientos"},{id:"tuneles",l:"Estado Túneles"}].map(({id,l})=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"11px",border:"none",background:"none",
              borderBottom:`2px solid ${tab===id?C.blue600:"transparent"}`,
              color:tab===id?C.blue700:C.textMut,fontWeight:tab===id?700:500,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              {l}
            </button>
          ))}
        </div>

        {/* STOCK */}
        {tab==="stock"&&(
          <div style={{overflowX:"auto"}}>
            {items.length===0&&(
              <div style={{padding:"60px 20px",textAlign:"center",color:C.textMut}}>
                <Boxes size={32} color={C.textMut} style={{margin:"0 auto 10px"}}/>
                <p style={{fontWeight:700}}>Sin stock registrado</p>
                <p style={{fontSize:12,marginTop:6}}>Registra un carro congelado para ver stock aquí</p>
              </div>
            )}
            {items.length>0&&(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:C.blue900}}>
                    {["Producto","Lote","Calibre","Kg Disponibles","Cajas","Última mov.",""].map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.blue300,textTransform:"uppercase",letterSpacing:.5}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it,i)=>(
                    <tr key={it.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":C.blue50}}>
                      <td style={{padding:"10px 12px",fontWeight:700,color:C.text}}>{it.producto_tipo_nombre||it.nombre_material||"—"}</td>
                      <td style={{padding:"10px 12px",color:C.textSub,fontFamily:"monospace",fontSize:11}}>{it.lote_codigo||"—"}</td>
                      <td style={{padding:"10px 12px",color:C.textSub}}>{it.calibre_nombre||"—"}</td>
                      <td style={{padding:"10px 12px"}}>
                        <span style={{fontWeight:800,fontSize:14,color:parseFloat(it.kilos_disponibles)>0?C.blue900:"#ef4444"}}>
                          {fmtDecimal(it.kilos_disponibles)}
                        </span>
                        <span style={{color:C.textMut,fontSize:10,marginLeft:3}}>kg</span>
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <span style={{fontWeight:800,color:parseInt(it.num_cajas)>0?"#15803d":"#94a3b8"}}>{it.num_cajas}</span>
                      </td>
                      <td style={{padding:"10px 12px",color:C.textMut,fontSize:11}}>{fmtFecha(it.updated_at)}</td>
                      <td style={{padding:"10px 12px"}}>
                        <button onClick={()=>abrirMovimiento(it)} style={{display:"flex",alignItems:"center",gap:4,
                          padding:"5px 10px",background:C.blue50,border:`1px solid ${C.blue200}`,
                          borderRadius:7,color:C.blue700,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                          Movimiento
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* MOVIMIENTOS */}
        {tab==="movimientos"&&(
          <div style={{overflowX:"auto"}}>
            {movs.length===0&&<p style={{textAlign:"center",color:C.textMut,padding:"40px 0"}}>Sin movimientos</p>}
            {movs.length>0&&(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:C.blue900}}>
                    {["Fecha","Producto","Tipo","Kg","Cajas","Motivo","Registrado por"].map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.blue300,textTransform:"uppercase",letterSpacing:.5}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movs.map((m,i)=>(
                    <tr key={m.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":C.blue50}}>
                      <td style={{padding:"8px 12px",color:C.textSub,fontSize:11}}>{fmtFecha(m.fecha)}</td>
                      <td style={{padding:"8px 12px",fontWeight:600,color:C.text}}>{m.producto_tipo_nombre||m.nombre_material||"—"}</td>
                      <td style={{padding:"8px 12px"}}>
                        <span style={{padding:"2px 8px",borderRadius:12,fontSize:10,fontWeight:700,
                          background:m.tipo==="entrada"?"#dcfce7":"#fef2f2",
                          color:m.tipo==="entrada"?"#15803d":"#dc2626"}}>
                          {m.tipo==="entrada"?"↓ Entrada":"↑ Salida"}
                        </span>
                      </td>
                      <td style={{padding:"8px 12px",fontWeight:700,color:m.tipo==="entrada"?"#15803d":"#dc2626"}}>
                        {fmtDecimal(m.cantidad_kg)} kg
                      </td>
                      <td style={{padding:"8px 12px",fontWeight:700,color:m.tipo==="entrada"?"#15803d":"#dc2626"}}>
                        {m.cantidad_cajas||0}
                      </td>
                      <td style={{padding:"8px 12px",color:C.textSub,fontSize:11,maxWidth:200}}>{m.motivo||"—"}</td>
                      <td style={{padding:"8px 12px",color:C.textMut,fontSize:11}}>{m.registrado_por_nombre||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TÚNELES */}
        {tab==="tuneles"&&(
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
            <p style={{fontSize:11,color:C.textMut,fontWeight:600}}>Estado en tiempo real de los túneles de congelamiento</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              {tuneles.map(t=>{
                const pct = t.capacidad_max>0 ? Math.round((t.carros_actuales/t.capacidad_max)*100) : 0;
                const color = pct>80?"#dc2626":pct>50?"#d97706":"#4f46e5";
                return (
                  <div key={t.id} style={{borderRadius:12,border:`2px solid ${t.carros_actuales>0?"#a5b4fc":"#e2e8f0"}`,
                    padding:"14px 16px",background:t.carros_actuales>0?"#eef2ff":"#f8faff"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <p style={{fontWeight:800,fontSize:14,color:t.carros_actuales>0?"#3730a3":C.textMut}}>{t.nombre}</p>
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:12,
                        background:t.carros_actuales>0?"#c7d2fe":"#e2e8f0",
                        color:t.carros_actuales>0?"#3730a3":"#94a3b8"}}>
                        {t.carros_actuales>0?"ACTIVO":"LIBRE"}
                      </span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                      <div style={{textAlign:"center",background:"white",borderRadius:8,padding:"8px 4px"}}>
                        <p style={{fontSize:9,color:C.textMut,fontWeight:700,textTransform:"uppercase"}}>Cajas</p>
                        <p style={{fontSize:24,fontWeight:900,color:color,lineHeight:1}}>{t.cajas_en_tunel||0}</p>
                      </div>
                      <div style={{textAlign:"center",background:"white",borderRadius:8,padding:"8px 4px"}}>
                        <p style={{fontSize:9,color:C.textMut,fontWeight:700,textTransform:"uppercase"}}>Carros</p>
                        <p style={{fontSize:24,fontWeight:900,color:color,lineHeight:1}}>{t.carros_actuales}</p>
                        <p style={{fontSize:9,color:C.textMut}}>de {t.capacidad_max}</p>
                      </div>
                    </div>
                    <div style={{height:6,borderRadius:6,background:"#e0e7ff",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:6,transition:"width .4s"}}/>
                    </div>
                    <p style={{fontSize:10,color:C.textMut,textAlign:"right",marginTop:4}}>{pct}% ocupado</p>
                  </div>
                );
              })}
            </div>
            {statsCarros&&(
              <div style={{background:C.blue50,borderRadius:12,padding:"12px 16px",border:`1px solid ${C.blue100}`}}>
                <p style={{fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:8}}>Resumen global de cajas</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
                  {[
                    {l:"Sin asignar",   v:statsCarros.cajas.sin_asignar,  c:"#94a3b8"},
                    {l:"En carros",     v:statsCarros.cajas.asignadas,    c:"#4f46e5"},
                    {l:"En inventario", v:statsCarros.cajas.en_inventario,c:"#15803d"},
                    {l:"Total",         v:statsCarros.cajas.total,        c:C.blue900},
                  ].map(({l,v,c})=>(
                    <div key={l} style={{background:"white",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                      <p style={{fontSize:9,color:C.textMut,fontWeight:700,textTransform:"uppercase"}}>{l}</p>
                      <p style={{fontSize:20,fontWeight:900,color:c}}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: Registrar Carro Congelado ──────────────────── */}
      {modal==="carro"&&(
        <Modal titulo="Registrar Carro Congelado en Inventario" onClose={()=>setModal(null)}>
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>

            <F label="Carro congelado *">
              <select value={fCarro.carro_id}
                onChange={e=>seleccionarCarro(e.target.value)}
                style={iS}>
                <option value="">— Seleccionar carro —</option>
                {carrosPendientes.map(c=>(
                  <option key={c.id} value={c.id}>
                    {c.codigo_carro} · {c.total_cajas-c.cajas_inventariadas} cajas pendientes · {fmtDecimal(c.kilos_totales)} kg
                  </option>
                ))}
              </select>
            </F>

            {/* Datos exactos del carro — readonly, vienen del backend */}
            {cargandoC&&(
              <div style={{textAlign:"center",padding:"16px",color:C.textMut,fontSize:12}}>
                Consultando datos exactos del carro...
              </div>
            )}

            {resumen&&!cargandoC&&(
              <>
                {/* Info con kg exactos — bloqueados */}
                <div style={{background:"#f0fdf4",borderRadius:12,padding:"12px 16px",
                  border:"1.5px solid #a7f3d0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                    <Lock size={13} color="#15803d"/>
                    <p style={{fontSize:12,fontWeight:700,color:"#15803d"}}>Kg calculados exactamente desde las cajas del carro</p>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div style={{background:"white",borderRadius:8,padding:"10px 12px"}}>
                      <p style={{fontSize:9,color:C.textMut,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Kg Totales Exactos</p>
                      <p style={{fontSize:20,fontWeight:900,color:C.blue900}}>{fmtDecimal(resumen.kg_total_exacto)} kg</p>
                    </div>
                    <div style={{background:"white",borderRadius:8,padding:"10px 12px"}}>
                      <p style={{fontSize:9,color:C.textMut,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Total Cajas</p>
                      <p style={{fontSize:20,fontWeight:900,color:"#15803d"}}>{resumen.total_cajas}</p>
                    </div>
                  </div>
                  {resumen.cajas_ya_inventariadas>0&&(
                    <div style={{marginTop:8,background:"#fff7ed",borderRadius:8,padding:"6px 10px",
                      display:"flex",gap:6,alignItems:"center"}}>
                      <Info size={12} color="#c2410c"/>
                      <span style={{fontSize:11,color:"#c2410c"}}>
                        {resumen.cajas_ya_inventariadas} cajas ya inventariadas ({fmtDecimal(resumen.kg_ya_inventariados)} kg)
                      </span>
                    </div>
                  )}
                </div>

                {/* Desglose por producto */}
                {desgloseResumen.length>1&&(
                  <div style={{background:C.blue50,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.blue100}`}}>
                    <p style={{fontSize:11,fontWeight:700,color:C.blue700,marginBottom:8}}>Desglose del carro:</p>
                    {desgloseResumen.map((d,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",
                        borderBottom:i<desgloseResumen.length-1?`1px solid ${C.border}`:"none"}}>
                        <span style={{color:C.text}}>{d.producto_nombre} {d.calibre_nombre||""}</span>
                        <span style={{fontWeight:700,color:C.blue900}}>{fmtDecimal(d.kg)} kg · {d.cajas} cajas</span>
                      </div>
                    ))}
                  </div>
                )}

                <F label="Tipo de Producto *">
                  <select value={fCarro.producto_tipo_id}
                    onChange={e=>setFCarr(p=>({...p,producto_tipo_id:e.target.value,calibre_id:""}))}
                    style={iS}>
                    <option value="">— Seleccionar —</option>
                    {desgloseResumen.map((d,i)=>(
                      <option key={i} value={d.producto_tipo_id}>
                        {d.producto_nombre} — {fmtDecimal(d.kg)} kg · {d.cajas} cajas
                      </option>
                    ))}
                    {desgloseResumen.length===0&&tipos.map(t=>(
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </F>

                {fCarro.producto_tipo_id&&(
                  <F label="Calibre">
                    <select value={fCarro.calibre_id}
                      onChange={e=>setFCarr(p=>({...p,calibre_id:e.target.value}))}
                      style={iS}>
                      <option value="">— Sin calibre —</option>
                      {calibres.filter(cb=>cb.producto_tipo_id===+fCarro.producto_tipo_id).map(cb=>(
                        <option key={cb.id} value={cb.id}>{cb.nombre}</option>
                      ))}
                    </select>
                  </F>
                )}

                {/* Preview de lo que se va a registrar */}
                {fCarro.producto_tipo_id&&(
                  <div style={{background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,
                    borderRadius:12,padding:"12px 16px",display:"flex",gap:20}}>
                    <div style={{textAlign:"center"}}>
                      <p style={{fontSize:9,color:C.blue300,fontWeight:700,textTransform:"uppercase"}}>SE REGISTRARÁN</p>
                      <p style={{fontSize:20,fontWeight:900,color:"white"}}>
                        {fmtDecimal(resumen.kg_total_exacto)} kg
                      </p>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <p style={{fontSize:9,color:C.blue300,fontWeight:700,textTransform:"uppercase"}}>CAJAS</p>
                      <p style={{fontSize:20,fontWeight:900,color:"white"}}>{resumen.total_cajas}</p>
                    </div>
                    <div style={{marginLeft:"auto",textAlign:"right"}}>
                      <p style={{fontSize:9,color:C.blue300,fontWeight:700,textTransform:"uppercase"}}>LOTE</p>
                      <p style={{fontSize:14,fontWeight:700,color:"white"}}>{resumen.lote_codigo}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,background:C.blue50,display:"flex",gap:10,flexShrink:0}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:"10px",background:"white",
              border:`1px solid ${C.border}`,borderRadius:10,color:C.textSub,fontWeight:600,
              cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
            <button onClick={registrarCarro}
              disabled={!fCarro.carro_id||!fCarro.producto_tipo_id||!resumen||cargandoC}
              style={{flex:2,padding:"10px",
                background:(!fCarro.carro_id||!fCarro.producto_tipo_id||!resumen)?"#e2e8f0":"#15803d",
                border:"none",borderRadius:10,color:"white",fontWeight:700,
                cursor:(!fCarro.carro_id||!fCarro.producto_tipo_id||!resumen)?"not-allowed":"pointer",
                fontFamily:"inherit"}}>
              ✅ Ingresar al Inventario ({resumen?`${fmtDecimal(resumen.kg_total_exacto)} kg exactos`:""})
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Movimiento ─────────────────────────────────── */}
      {modal==="movimiento"&&selItem&&(
        <Modal titulo={`Movimiento — ${selItem.producto_tipo_nombre||selItem.nombre_material}`} onClose={()=>setModal(null)}>
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            {/* Stock actual */}
            <div style={{background:C.blue50,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.blue100}`,
              display:"flex",gap:16,alignItems:"center"}}>
              <div>
                <p style={{fontSize:9,color:C.textMut,fontWeight:700,textTransform:"uppercase"}}>Stock Kg</p>
                <p style={{fontWeight:900,fontSize:18,color:C.blue900}}>{fmtDecimal(selItem.kilos_disponibles)} kg</p>
              </div>
              <div>
                <p style={{fontSize:9,color:C.textMut,fontWeight:700,textTransform:"uppercase"}}>Cajas</p>
                <p style={{fontWeight:900,fontSize:18,color:"#15803d"}}>{selItem.num_cajas}</p>
              </div>
              <div style={{marginLeft:"auto",fontSize:11,color:C.textMut}}>Lote: {selItem.lote_codigo||"—"}</div>
            </div>

            {/* Tipo */}
            <div style={{display:"flex",gap:8}}>
              {[{v:"entrada",l:"↓ Entrada"},{v:"salida",l:"↑ Salida"}].map(({v,l})=>(
                <button key={v} onClick={()=>setFM(p=>({...p,tipo:v}))} style={{flex:1,padding:"10px",
                  border:`2px solid ${fMov.tipo===v?(v==="entrada"?"#15803d":"#dc2626"):C.border}`,
                  borderRadius:10,background:fMov.tipo===v?(v==="entrada"?"#dcfce7":"#fef2f2"):"white",
                  color:fMov.tipo===v?(v==="entrada"?"#15803d":"#dc2626"):C.textMut,
                  fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>{l}</button>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <F label="Cantidad Kg">
                <input type="number" min="0" step="0.01"
                  value={fMov.cantidad_kg}
                  onChange={e=>setFM(p=>({...p,cantidad_kg:e.target.value}))}
                  placeholder={fMov.tipo==="salida"?`Máx ${fmtDecimal(selItem.kilos_disponibles)}`:"0.00"}
                  style={iS}/>
                {fMov.tipo==="salida"&&fMov.cantidad_kg&&parseFloat(fMov.cantidad_kg)>parseFloat(selItem.kilos_disponibles)&&(
                  <p style={{fontSize:10,color:"#dc2626",marginTop:3}}>
                    ⚠ Supera stock: {fmtDecimal(selItem.kilos_disponibles)} kg disponibles
                  </p>
                )}
              </F>
              <F label="Cantidad Cajas">
                <input type="number" min="0"
                  value={fMov.cantidad_cajas}
                  onChange={e=>setFM(p=>({...p,cantidad_cajas:e.target.value}))}
                  placeholder={fMov.tipo==="salida"?`Máx ${selItem.num_cajas}`:"0"}
                  style={iS}/>
                {fMov.tipo==="salida"&&fMov.cantidad_cajas&&parseInt(fMov.cantidad_cajas)>parseInt(selItem.num_cajas)&&(
                  <p style={{fontSize:10,color:"#dc2626",marginTop:3}}>
                    ⚠ Supera stock: {selItem.num_cajas} cajas disponibles
                  </p>
                )}
              </F>
            </div>

            <F label="Motivo">
              <input value={fMov.motivo}
                onChange={e=>setFM(p=>({...p,motivo:e.target.value}))}
                placeholder="Ej: Ajuste de inventario, devolución, etc."
                style={iS}/>
            </F>
            <F label="Documento">
              <input value={fMov.documento}
                onChange={e=>setFM(p=>({...p,documento:e.target.value}))}
                placeholder="N° guía, factura..."
                style={iS}/>
            </F>
          </div>

          <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,background:C.blue50,display:"flex",gap:10}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:"10px",background:"white",
              border:`1px solid ${C.border}`,borderRadius:10,color:C.textSub,fontWeight:600,
              cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
            <button onClick={registrarMovimiento}
              style={{flex:2,padding:"10px",
                background:fMov.tipo==="entrada"?"#15803d":"#dc2626",
                border:"none",borderRadius:10,color:"white",fontWeight:700,
                cursor:"pointer",fontFamily:"inherit"}}>
              {fMov.tipo==="entrada"?"↓ Registrar Entrada":"↑ Registrar Salida"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
