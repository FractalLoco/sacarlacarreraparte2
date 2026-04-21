import { useState, useEffect } from "react";
import { dashboardAPI, turnosAPI } from "../api/client";
import { C, fmt } from "../constants/theme";
import { Package, Scale, Thermometer, Boxes, Truck, BarChart2,
         Clock, User, TrendingUp, TrendingDown } from "lucide-react";

const KPI = ({label,value,sub,color="blue",icon:Icon}) => {
  const COLORS={blue:{bg:C.blue50,border:C.blue200,text:C.blue700,val:C.blue900},green:{bg:"#dcfce7",border:"#a7f3d0",text:"#15803d",val:"#14532d"},orange:{bg:"#fff7ed",border:"#fed7aa",text:"#c2410c",val:"#7c2d12"},purple:{bg:"#f3e8ff",border:"#e9d5ff",text:"#7c3aed",val:"#4c1d95"},gray:{bg:"#f1f5f9",border:"#e2e8f0",text:"#64748b",val:"#1e293b"}};
  const s=COLORS[color]||COLORS.blue;
  return (
    <div style={{background:s.bg,borderRadius:14,border:`1.5px solid ${s.border}`,padding:"14px 16px",display:"flex",flexDirection:"column",gap:6}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <p style={{fontSize:10,fontWeight:700,color:s.text,textTransform:"uppercase",letterSpacing:.5,lineHeight:1.3}}>{label}</p>
        {Icon&&<Icon size={16} color={s.text} style={{opacity:.7,flexShrink:0}}/>}
      </div>
      <p style={{fontSize:26,fontWeight:900,color:s.val,lineHeight:1}}>{value}</p>
      {sub&&<p style={{fontSize:11,color:s.text,opacity:.8}}>{sub}</p>}
    </div>
  );
};

const TunelBar = ({tunel}) => {
  const pct = Math.min(Math.round((tunel.ocupados/tunel.capacidad_max)*100),100);
  const color = pct>=90?"#dc2626":pct>=70?"#f59e0b":"#15803d";
  return (
    <div style={{background:"white",borderRadius:12,border:`1.5px solid ${pct>=90?"#fca5a5":C.border}`,padding:"12px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontWeight:700,fontSize:13,color:C.blue900}}>{tunel.nombre}</span>
        {pct>=90&&<span style={{fontSize:10,fontWeight:700,color:"#dc2626",background:"#fef2f2",padding:"2px 6px",borderRadius:20}}>LLENO</span>}
        <span style={{fontWeight:800,color,fontSize:13}}>{tunel.ocupados}/{tunel.capacidad_max}</span>
      </div>
      <div style={{background:"#f1f5f9",borderRadius:6,height:8,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:6,transition:"width .5s"}}/>
      </div>
    </div>
  );
};

const BarraComparacion = ({label,producido,despachado}) => {
  const max = Math.max(producido,despachado,1);
  const pctP = (producido/max)*100;
  const pctD = (despachado/max)*100;
  return (
    <div style={{background:"white",borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 16px"}}>
      <p style={{fontWeight:700,fontSize:13,color:C.blue900,marginBottom:10}}>{label}</p>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
            <span style={{color:C.blue700,fontWeight:700}}>Producido</span>
            <span style={{fontWeight:800,color:C.blue900}}>{fmt(producido)} kg</span>
          </div>
          <div style={{background:"#f1f5f9",borderRadius:6,height:8,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pctP}%`,background:C.blue600,borderRadius:6,transition:"width .5s"}}/>
          </div>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
            <span style={{color:"#c2410c",fontWeight:700}}>Despachado</span>
            <span style={{fontWeight:800,color:"#c2410c"}}>{fmt(despachado)} kg</span>
          </div>
          <div style={{background:"#f1f5f9",borderRadius:6,height:8,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pctD}%`,background:"#f97316",borderRadius:6,transition:"width .5s"}}/>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:4,borderTop:`1px solid ${C.border}`,fontSize:11}}>
          <span style={{color:C.textMut}}>Stock disponible</span>
          <span style={{fontWeight:800,color:producido-despachado>=0?"#15803d":"#dc2626"}}>{fmt(Math.max(0,producido-despachado))} kg</span>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard({ onToast }) {
  const [data,  setData]  = useState(null);
  const [turno, setTurno] = useState(null);

  useEffect(()=>{
    const cargar = () => {
      dashboardAPI.stats().then(setData).catch(e=>onToast(e.message,"error"));
      turnosAPI.activo().then(setTurno).catch(()=>setTurno(null));
    };
    cargar();
    const t = setInterval(cargar,30000);
    return ()=>clearInterval(t);
  },[]);

  if (!data) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:C.textMut,fontSize:14}}>Cargando...</div>;

  const {lotes,produccion,carros,cajas,tuneles,inventario,despachos_hoy} = data;
  const kgPendiente = parseFloat(inventario?.kg_disponibles||0) - parseFloat(despachos_hoy?.kg_despachado_hoy||0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      
      {/* Turno activo */}
      {turno && (
        <div style={{background:`linear-gradient(135deg,#7c3aed,#6d28d9)`,borderRadius:14,padding:"12px 18px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:"#4ade80",animation:"ping 1.5s ease-in-out infinite",boxShadow:"0 0 0 0 #4ade80",flexShrink:0}}/>
          <div style={{flex:1,minWidth:200}}>
            <p style={{color:"white",fontWeight:800,fontSize:14}}>Turno Activo: {turno.nombre}</p>
            <p style={{color:"rgba(255,255,255,.6)",fontSize:12,display:"flex",alignItems:"center",gap:8}}>
              <User size={11}/>{turno.supervisor_nombre||"—"}
              <span style={{marginLeft:4}}><Clock size={11}/> desde {new Date(turno.hora_inicio).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}</span>
            </p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{color:"#4ade80",fontWeight:900,fontSize:18}}>{fmt(turno.kilos_producidos||0)} kg</p>
            <p style={{color:"rgba(255,255,255,.5)",fontSize:11}}>{turno.cajas_producidas||0} cajas producidas</p>
          </div>
          <style>{"@keyframes ping{0%,100%{box-shadow:0 0 0 0 #4ade8088}50%{box-shadow:0 0 0 8px #4ade8000}}"}</style>
        </div>
      )}

      {/* Lote en proceso */}
      {lotes.en_proceso>0&&(
        <div style={{background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:12,height:12,borderRadius:"50%",background:"#4ade80",animation:"ping 1.5s ease-in-out infinite",boxShadow:"0 0 0 0 #4ade80"}}/>
          <div>
            <p style={{color:"white",fontWeight:800,fontSize:14}}>Lote en proceso activo</p>
            <p style={{color:"rgba(255,255,255,.6)",fontSize:12}}>Producción registrando actualmente</p>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <p style={{color:"#4ade80",fontWeight:900,fontSize:20}}>{fmt(produccion?.kilos_hoy||0)} kg</p>
            <p style={{color:"rgba(255,255,255,.5)",fontSize:11}}>producidos hoy</p>
          </div>
        </div>
      )}

      {/* PRODUCCIÓN */}
      <div>
        <p style={{fontSize:11,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Producción</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
          <KPI label="Kg Producidos Total" value={`${fmt(produccion?.kilos_neto_total||0)} kg`} sub="producto neto" color="blue" icon={Scale}/>
          <KPI label="Cajas Producidas" value={fmt(produccion?.total_cajas_producidas||0)} sub="en todos los lotes" color="green" icon={Package}/>
          <KPI label="Cajas Hoy" value={produccion?.cajas_hoy||0} sub={`${fmt(produccion?.kilos_hoy||0)} kg hoy`} color="orange" icon={Scale}/>
          <KPI label="Lotes Cerrados" value={lotes.cerrados||0} sub={`${lotes.total||0} total`} color="gray" icon={BarChart2}/>
        </div>
      </div>

      {/* PANEL PRODUCCION vs DESPACHO */}
      <div>
        <p style={{fontSize:11,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Producción vs Despacho</p>
        <BarraComparacion label="Balance General" producido={parseFloat(produccion?.kilos_neto_total||0)} despachado={parseFloat(inventario?.kg_disponibles||0)===0?0:parseFloat(produccion?.kilos_neto_total||0)-parseFloat(inventario?.kg_disponibles||0)}/>
      </div>

      {/* CARROS Y CAJAS */}
      <div>
        <p style={{fontSize:11,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Carros y Cajas</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
          <KPI label="Cargando" value={carros?.cargando||0} sub="recibiendo cajas" color="blue" icon={Package}/>
          <KPI label="Listos" value={carros?.listos||0} sub="para el túnel" color="green" icon={Package}/>
          <KPI label="En Túnel" value={carros?.en_tunel||0} sub="congelando ahora" color="orange" icon={Thermometer}/>
          <KPI label="Congelados" value={carros?.congelados||0} sub="pendientes inventario" color="purple" icon={Boxes}/>
          <KPI label="Cajas Libres" value={cajas?.sin_asignar||0} sub="sin carro asignado" color="gray" icon={Package}/>
          <KPI label="En Inventario" value={cajas?.en_inventario||0} sub="cajas registradas" color="green" icon={Boxes}/>
        </div>
      </div>

      {/* INVENTARIO */}
      <div>
        <p style={{fontSize:11,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Inventario Disponible</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
          <KPI label="Kg Disponibles" value={`${fmt(inventario?.kg_disponibles||0)} kg`} sub="stock de producto" color="blue" icon={Boxes}/>
          <KPI label="Cajas en Stock" value={inventario?.cajas_disponibles||0} sub="cajas enteras" color="green" icon={Package}/>
          <KPI label="Kg Despachados Hoy" value={`${fmt(despachos_hoy?.kg_despachado_hoy||0)} kg`} sub={`${despachos_hoy?.cajas_despachadas_hoy||0} cajas`} color="orange" icon={Truck}/>
        </div>
      </div>

      {/* TÚNELES */}
      {tuneles?.length>0&&(
        <div>
          <p style={{fontSize:11,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Estado Túneles</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
            {tuneles.map(t=><TunelBar key={t.id} tunel={t}/>)}
          </div>
        </div>
      )}
    </div>
  );
}