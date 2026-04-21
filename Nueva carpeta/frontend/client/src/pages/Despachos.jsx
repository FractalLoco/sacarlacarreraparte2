import { useState, useEffect } from "react";
import { Plus, Truck, FileText, Package, Building2, CheckCircle, ArrowUp, X } from "lucide-react";
import { despachosAPI, inventarioAPI, conductoresAPI } from "../api/client";
import { C, iS, fmt, fmtFecha } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";

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
const ESTADO_C={pendiente:{bg:"#f1f5f9",text:"#64748b"},despachado:{bg:"#dcfce7",text:"#15803d"},anulado:{bg:"#fef2f2",text:"#dc2626"}};

export default function Despachos({ onToast }) {
  const { isMobile } = useResponsive();
  const [despachos,   setDespachos]  = useState([]);
  const [clientes,    setClientes]   = useState([]);
  const [conductores, setConductores]= useState([]);
  const [inventario,  setInventario] = useState([]);
  const [modal,       setModal]      = useState(null);
  const [filtFecha,   setFiltFecha]  = useState({desde:"",hasta:""});

  // Form nuevo despacho
  const formInit = {numero_guia:"",fecha_despacho:new Date().toISOString().slice(0,10),cliente_id:"",cliente_nombre:"",cliente_rut:"",destino:"",conductor_id:"",patente_camion:"",empresa_transporte:"",temperatura_despacho:"",observacion:""};
  const [form,  setForm]  = useState(formInit);
  const [items, setItems] = useState([]); // items seleccionados para el despacho
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const cargar = async () => {
    try {
      const [d,cl,co,inv] = await Promise.all([
        despachosAPI.listar(filtFecha),
        despachosAPI.clientes(),
        conductoresAPI.listar({activo:"true"}),
        inventarioAPI.listar({categoria_inv:"producto"}),
      ]);
      setDespachos(d); setClientes(cl); setConductores(co);
      setInventario(inv.filter(i=>i.kilos_disponibles>0||i.num_cajas>0));
    } catch(e){ onToast(e.message,"error"); }
  };

  useEffect(()=>{ cargar(); },[filtFecha]);

  const abrirNuevo = () => {
    setForm({...formInit,numero_guia:`GD-${Date.now().toString().slice(-6)}`});
    setItems([]);
    setModal("nuevo");
  };

  const agregarItem = (inv_item) => {
    if (items.find(i=>i.inventario_id===inv_item.id)) return onToast("Ya está en el despacho","error");
    setItems(prev=>[...prev,{
      inventario_id: inv_item.id,
      nombre_item: `${inv_item.producto_tipo_nombre||inv_item.nombre_material||"---"}${inv_item.calibre_nombre?" "+inv_item.calibre_nombre:""}`,
      lote_codigo: inv_item.lote_codigo,
      max_kg: parseFloat(inv_item.kilos_disponibles),
      max_cajas: parseInt(inv_item.num_cajas),
      cantidad_kg: parseFloat(inv_item.kilos_disponibles).toFixed(2),
      cantidad_cajas: inv_item.num_cajas,
      precio_unitario: "",
    }]);
  };

  const editarItem = (idx,k,v) => setItems(prev=>prev.map((it,i)=>i===idx?{...it,[k]:v}:it));
  const quitarItem = (idx) => setItems(prev=>prev.filter((_,i)=>i!==idx));

  const crearDespacho = async () => {
    try {
      if (!items.length) return onToast("Agrega al menos un item","error");
      const payload = {
        ...form,
        items: items.map(it=>({
          inventario_id: it.inventario_id,
          nombre_item: it.nombre_item,
          cantidad_kg: parseFloat(it.cantidad_kg||0),
          cantidad_cajas: parseInt(it.cantidad_cajas||0),
          precio_unitario: it.precio_unitario?parseFloat(it.precio_unitario):null,
        })),
      };
      await despachosAPI.crear(payload);
      onToast("Despacho creado y guía generada ✓");
      setModal(null); cargar();
    } catch(e){ onToast(e.message,"error"); }
  };

  const descargarPDF = async (id) => {
    try { await despachosAPI.guiaPDF(id); onToast("PDF descargado"); }
    catch(e){ onToast(e.message,"error"); }
  };

  const totalKg = items.reduce((s,it)=>s+parseFloat(it.cantidad_kg||0),0);
  const totalCajas = items.reduce((s,it)=>s+parseInt(it.cantidad_cajas||0),0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Header */}
      <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <Truck size={17} color={C.blue600}/>
        <span style={{fontWeight:800,fontSize:16,color:C.blue900,flex:1}}>Despachos</span>
        <input type="date" value={filtFecha.desde} onChange={e=>setFiltFecha(p=>({...p,desde:e.target.value}))} style={{...iS,width:"auto",fontSize:12}}/>
        <input type="date" value={filtFecha.hasta} onChange={e=>setFiltFecha(p=>({...p,hasta:e.target.value}))} style={{...iS,width:"auto",fontSize:12}}/>
        <button onClick={abrirNuevo} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",background:C.blue900,border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          <Plus size={14}/> Nuevo Despacho
        </button>
      </div>

      {/* Lista de despachos */}
      {despachos.length===0&&<div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:"60px 20px",textAlign:"center"}}><Truck size={32} color={C.textMut} style={{margin:"0 auto 10px"}}/><p style={{color:C.textSub,fontWeight:700}}>Sin despachos registrados</p></div>}
      {despachos.map((d,idx)=>{
        const ec=ESTADO_C[d.estado]||ESTADO_C.pendiente;
        return (
          <div key={d.id} style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:"14px 16px",animation:`fadeUp .3s ease ${idx*40}ms both`}}>
            <div style={{display:"flex",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontWeight:900,fontSize:16,color:C.blue900,fontFamily:"monospace"}}>{d.numero_guia}</span>
                  <span style={{padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:ec.bg,color:ec.text}}>{d.estado}</span>
                </div>
                <p style={{fontSize:12,color:C.textMut}}>{fmtFecha(d.fecha_despacho)}</p>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                {[{l:"Items",v:d.total_items||0},{l:"Kg",v:`${fmt(d.total_kg)} kg`},{l:"Cajas",v:d.total_cajas||0}].map(({l,v})=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <p style={{fontSize:9,color:C.textMut,fontWeight:700,textTransform:"uppercase"}}>{l}</p>
                    <p style={{fontSize:15,fontWeight:800,color:C.blue900}}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${C.border}`,marginBottom:10}}>
              {(d.cliente_nombre||d.cliente_nombre_reg)&&<span style={{fontSize:12,color:C.textSub,display:"flex",alignItems:"center",gap:5}}><Building2 size={12} color={C.blue500}/><strong style={{color:C.text}}>{d.cliente_nombre||d.cliente_nombre_reg}</strong></span>}
              {d.destino&&<span style={{fontSize:12,color:C.textSub}}>→ {d.destino}</span>}
              {d.conductor_nombre&&<span style={{fontSize:12,color:C.textSub,display:"flex",alignItems:"center",gap:5}}><Truck size={12} color={C.blue500}/>{d.conductor_nombre}</span>}
              {d.patente_camion&&<span style={{background:C.blue900,color:"white",borderRadius:5,padding:"1px 7px",fontFamily:"monospace",fontSize:11,fontWeight:700}}>{d.patente_camion}</span>}
            </div>
            <div style={{display:"flex",gap:7}}>
              <button onClick={()=>descargarPDF(d.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:9,color:"#dc2626",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}><FileText size={11}/> Guía PDF</button>
            </div>
          </div>
        );
      })}

      {/* Modal nuevo despacho */}
      {modal==="nuevo"&&(
        <Modal titulo="Nuevo Despacho" onClose={()=>setModal(null)} wide>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:0}}>
            {/* Col izq: formulario */}
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:14,borderRight:isMobile?"none":`1px solid ${C.border}`}}>
              <p style={{fontWeight:700,fontSize:13,color:C.blue900}}>Datos del Despacho</p>
              {[
                {k:"numero_guia",l:"N° Guía *",ph:"GD-001"},
                {k:"fecha_despacho",l:"Fecha *",type:"date"},
              ].map(({k,l,ph,type})=>(
                <div key={k}><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:5}}>{l}</label>
                <input type={type||"text"} value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={ph} style={iS}/></div>
              ))}

              <p style={{fontWeight:700,fontSize:12,color:C.blue700,marginTop:4}}>Cliente</p>
              <div><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:5}}>Cliente Registrado</label>
                <select value={form.cliente_id} onChange={e=>{ const cl=clientes.find(c=>c.id===+e.target.value); set("cliente_id",e.target.value); if(cl){set("cliente_nombre",cl.nombre);set("cliente_rut",cl.rut||"");} }} style={iS}>
                  <option value="">— Sin cliente registrado —</option>
                  {clientes.map(cl=><option key={cl.id} value={cl.id}>{cl.nombre}{cl.rut?` · ${cl.rut}`:""}</option>)}
                </select></div>
              {[{k:"cliente_nombre",l:"Nombre Cliente",ph:"Empresa o persona"},{k:"cliente_rut",l:"RUT Cliente",ph:"76.543.210-K"},{k:"destino",l:"Destino",ph:"Dirección de entrega"}].map(({k,l,ph})=>(
                <div key={k}><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:5}}>{l}</label>
                <input value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={ph} style={iS}/></div>
              ))}

              <p style={{fontWeight:700,fontSize:12,color:C.blue700,marginTop:4}}>Transporte</p>
              <div><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:5}}>Conductor</label>
                <select value={form.conductor_id} onChange={e=>{ const co=conductores.find(c=>c.id===+e.target.value); set("conductor_id",e.target.value); if(co){set("patente_camion",co.patente_habitual||"");set("empresa_transporte",co.empresa_transporte||"");} }} style={iS}>
                  <option value="">— Sin conductor —</option>
                  {conductores.map(co=><option key={co.id} value={co.id}>{co.nombre}{co.empresa_transporte?` · ${co.empresa_transporte}`:""}</option>)}
                </select></div>
              {[{k:"patente_camion",l:"Patente",ph:"ABCD12"},{k:"temperatura_despacho",l:"T° Despacho (°C)",type:"number",ph:"-18"}].map(({k,l,ph,type})=>(
                <div key={k}><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:5}}>{l}</label>
                <input type={type||"text"} value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={ph} style={{...iS,fontFamily:k==="patente_camion"?"monospace":"inherit"}}/></div>
              ))}
              <div><label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:5}}>Observación</label>
                <textarea rows={2} value={form.observacion} onChange={e=>set("observacion",e.target.value)} style={{...iS,resize:"none"}}/></div>
            </div>

            {/* Col der: items de inventario */}
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
              <p style={{fontWeight:700,fontSize:13,color:C.blue900}}>Items a Despachar</p>

              {/* Stock disponible */}
              <div style={{maxHeight:200,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:10}}>
                {inventario.length===0&&<p style={{padding:"20px",textAlign:"center",color:C.textMut,fontSize:12}}>Sin stock disponible</p>}
                {inventario.map(inv=>(
                  <div key={inv.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}} onClick={()=>agregarItem(inv)}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:700,fontSize:12,color:C.text}}>{inv.producto_tipo_nombre||inv.nombre_material} {inv.calibre_nombre||""}</p>
                      <p style={{fontSize:10,color:C.textMut}}>Lote: {inv.lote_codigo||"—"} · {fmt(inv.kilos_disponibles)} kg · {inv.num_cajas} cajas</p>
                    </div>
                    <button style={{padding:"3px 8px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:6,color:C.blue700,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Add</button>
                  </div>
                ))}
              </div>

              {/* Items seleccionados */}
              {items.length>0&&(
                <>
                  <p style={{fontWeight:600,fontSize:12,color:C.blue700}}>Items seleccionados ({items.length})</p>
                  {items.map((it,idx)=>(
                    <div key={idx} style={{background:C.blue50,borderRadius:10,border:`1px solid ${C.blue100}`,padding:"10px 12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <p style={{fontWeight:700,fontSize:12,color:C.blue900}}>{it.nombre_item}</p>
                        <button onClick={()=>quitarItem(idx)} style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:6,width:22,height:22,cursor:"pointer",color:"#dc2626",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                        <div><label style={{fontSize:9,fontWeight:700,color:C.textMut,textTransform:"uppercase",display:"block",marginBottom:4}}>Kg</label>
                          <input type="number" min="0" max={it.max_kg} step="0.01" value={it.cantidad_kg} onChange={e=>editarItem(idx,"cantidad_kg",e.target.value)}
                            style={{...iS,padding:"5px 8px",fontSize:12,borderColor:parseFloat(it.cantidad_kg)>it.max_kg?"#ef4444":undefined}}/>
                          {parseFloat(it.cantidad_kg)>it.max_kg&&<p style={{fontSize:9,color:"#dc2626",marginTop:2}}>⚠ Supera stock ({parseFloat(it.max_kg).toFixed(2)} kg)</p>}
                          </div>
                        <div><label style={{fontSize:9,fontWeight:700,color:C.textMut,textTransform:"uppercase",display:"block",marginBottom:4}}>Cajas</label>
                          <input type="number" min="0" max={it.max_cajas} value={it.cantidad_cajas} onChange={e=>editarItem(idx,"cantidad_cajas",e.target.value)} style={{...iS,padding:"5px 8px",fontSize:12}}/></div>
                        <div><label style={{fontSize:9,fontWeight:700,color:C.textMut,textTransform:"uppercase",display:"block",marginBottom:4}}>Precio/kg</label>
                          <input type="number" min="0" value={it.precio_unitario} onChange={e=>editarItem(idx,"precio_unitario",e.target.value)} placeholder="—" style={{...iS,padding:"5px 8px",fontSize:12}}/></div>
                      </div>
                    </div>
                  ))}
                  <div style={{background:C.blue900,borderRadius:10,padding:"10px 14px",display:"flex",gap:16}}>
                    <div style={{textAlign:"center"}}><p style={{fontSize:9,color:C.blue300,fontWeight:700}}>TOTAL KG</p><p style={{fontSize:16,fontWeight:800,color:"white"}}>{totalKg.toFixed(2)} kg</p></div>
                    <div style={{textAlign:"center"}}><p style={{fontSize:9,color:C.blue300,fontWeight:700}}>TOTAL CAJAS</p><p style={{fontSize:16,fontWeight:800,color:"white"}}>{totalCajas}</p></div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,background:C.blue50,display:"flex",gap:10,flexShrink:0}}>
            <button onClick={()=>setModal(null)} style={{flex:1,padding:"10px",background:"white",border:`1px solid ${C.border}`,borderRadius:10,color:C.textSub,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
            <button onClick={crearDespacho} disabled={!form.numero_guia||!items.length||items.some(it=>parseFloat(it.cantidad_kg)>it.max_kg||parseInt(it.cantidad_cajas||0)>it.max_cajas)} style={{flex:2,padding:"10px",background:(!form.numero_guia||!items.length)?"#e2e8f0":`linear-gradient(135deg,${C.blue900},${C.blue600})`,border:"none",borderRadius:10,color:(!form.numero_guia||!items.length)?C.textMut:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              <Truck size={13} style={{marginRight:6,verticalAlign:"middle"}}/>Crear Despacho y Generar Guía
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}