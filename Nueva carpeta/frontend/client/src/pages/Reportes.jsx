import { useState, useEffect } from "react";
import { FileText, Download, BarChart2, TrendingUp } from "lucide-react";
import { PanelCard } from "../components/atoms/Overlay";
import { reportesAPI, lotesAPI } from "../api/client";
import { C, iS, fmt, fmtFecha, fmtDecimal } from "../constants/theme";

export default function Reportes({ onToast }) {
  const [lotes,        setLotes]        = useState([]);
  const [comparacion,  setComparacion]  = useState([]);
  const [porLinea,     setPorLinea]     = useState([]);
  const [porTurno,     setPorTurno]     = useState([]);
  const [loteSel,      setLoteSel]      = useState("");
  const [lotesCmp,     setLotesCmp]     = useState([]);
  const [filtLinea,    setFiltLinea]    = useState({fecha_desde:"",fecha_hasta:"",lote_id:""});
  const [filtTurno,    setFiltTurno]    = useState({fecha_desde:"",fecha_hasta:"",lote_id:""});

  useEffect(()=>{ lotesAPI.listar({estado:"cerrado"}).then(setLotes); },[]);

  const descargarPDF = async () => {
    if(!loteSel){onToast("Selecciona un lote","warning");return;}
    try{onToast("Generando PDF...","info");await reportesAPI.pdf(loteSel);onToast("PDF descargado");}
    catch(e){onToast(e.message,"error");}
  };
  const descargarExcel = async () => {
    if(!loteSel){onToast("Selecciona un lote","warning");return;}
    try{onToast("Generando Excel...","info");await reportesAPI.excel(loteSel);onToast("Excel descargado");}
    catch(e){onToast(e.message,"error");}
  };
  const buscarComparacion = async () => {
    if(lotesCmp.length<2){onToast("Selecciona al menos 2 lotes","warning");return;}
    try{const d=await reportesAPI.comparacion(lotesCmp);setComparacion(d);}
    catch(e){onToast(e.message,"error");}
  };
  const buscarLinea = async () => {
    try{const d=await reportesAPI.porLinea(filtLinea);setPorLinea(d);}
    catch(e){onToast(e.message,"error");}
  };
  const buscarTurno = async () => {
    try{const d=await reportesAPI.porTurno(filtTurno);setPorTurno(d);}
    catch(e){onToast(e.message,"error");}
  };

  const toggleLoteCmp = (id) => {
    setLotesCmp(p=>p.includes(+id)?p.filter(x=>x!==+id):[...p,+id]);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>

      {/* Reporte de Produccion */}
      <PanelCard title="Reporte de Producción (PDF / Excel)" icon={<FileText size={15} color={C.blue500}/>}>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <p style={{fontSize:13,color:C.textMut}}>Genera el reporte completo de un lote cerrado, idéntico al formato oficial de la empresa.</p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:1,minWidth:220}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:7}}>Seleccionar Lote</label>
              <select value={loteSel} onChange={e=>setLoteSel(e.target.value)} style={iS}>
                <option value="">— Seleccionar lote cerrado —</option>
                {lotes.map(l=><option key={l.id} value={l.id}>{l.codigo} — {fmtFecha(l.fecha_ingreso)} — {fmt(l.kilos_brutos)} kg</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={descargarPDF} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",background:"#dc2626",border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                <FileText size={14}/> Descargar PDF
              </button>
              <button onClick={descargarExcel} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",background:"#059669",border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                <Download size={14}/> Descargar Excel
              </button>
            </div>
          </div>
        </div>
      </PanelCard>

      {/* Comparacion de lotes */}
      <PanelCard title="Comparación entre Lotes" icon={<BarChart2 size={15} color={C.blue500}/>}>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {lotes.map(l=>(
              <button key={l.id} onClick={()=>toggleLoteCmp(l.id)} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",background:lotesCmp.includes(l.id)?C.blue900:C.blue50,color:lotesCmp.includes(l.id)?"white":C.blue700,border:`1.5px solid ${lotesCmp.includes(l.id)?C.blue900:C.blue200}`}}>
                {l.codigo}
              </button>
            ))}
          </div>
          <button onClick={buscarComparacion} disabled={lotesCmp.length<2} style={{alignSelf:"flex-start",display:"flex",alignItems:"center",gap:7,padding:"9px 18px",background:lotesCmp.length<2?"#e2e8f0":C.blue900,border:"none",borderRadius:10,color:lotesCmp.length<2?C.textMut:"white",fontSize:13,fontWeight:700,cursor:lotesCmp.length<2?"default":"pointer",fontFamily:"inherit"}}>
            <BarChart2 size={14}/> Comparar
          </button>
          {comparacion.length>0&&(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:C.blue900}}>
                  {["Lote","Fecha","Kg Brutos","Producto","Kilos","Rendimiento"].map(h=>(
                    <th key={h} style={{padding:"9px 13px",textAlign:"left",fontSize:11,fontWeight:700,color:C.blue300,letterSpacing:.4}}>{h.toUpperCase()}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {comparacion.map((r,i)=>(
                    <tr key={i} className="row" style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:"9px 13px",fontWeight:700,color:C.blue900}}>{r.codigo}</td>
                      <td style={{padding:"9px 13px",color:C.textMut,fontSize:12}}>{fmtFecha(r.fecha_ingreso)}</td>
                      <td style={{padding:"9px 13px",fontWeight:700,color:C.text}}>{fmt(r.kilos_brutos)} kg</td>
                      <td style={{padding:"9px 13px",color:C.textSub}}>{r.producto||"—"}</td>
                      <td style={{padding:"9px 13px",fontWeight:700,color:C.blue900}}>{fmt(r.kilos)} kg</td>
                      <td style={{padding:"9px 13px"}}>
                        <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:C.blue50,color:C.blue700}}>{fmtDecimal(r.rendimiento)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PanelCard>

      {/* Por linea */}
      <PanelCard title="Producción por Línea" icon={<TrendingUp size={15} color={C.blue500}/>}>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
            {[{k:"lote_id",l:"Lote ID",type:"number",w:100},{k:"fecha_desde",l:"Desde",type:"date",w:160},{k:"fecha_hasta",l:"Hasta",type:"date",w:160}].map(({k,l,type,w})=>(
              <div key={k} style={{flex:1,minWidth:w}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>{l}</label>
                <input type={type||"text"} value={filtLinea[k]||""} onChange={e=>setFiltLinea(p=>({...p,[k]:e.target.value}))} style={iS}/>
              </div>
            ))}
            <button onClick={buscarLinea} style={{padding:"10px 18px",background:C.blue900,border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Buscar</button>
          </div>
          {porLinea.length>0&&(
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:C.blue900}}>
                {["Línea","Producto","Kilos","Pesajes"].map(h=>(
                  <th key={h} style={{padding:"9px 13px",textAlign:"left",fontSize:11,fontWeight:700,color:C.blue300,letterSpacing:.4}}>{h.toUpperCase()}</th>
                ))}
              </tr></thead>
              <tbody>
                {porLinea.map((r,i)=>(
                  <tr key={i} className="row" style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"9px 13px",fontWeight:700,color:C.blue900}}>{r.linea}</td>
                    <td style={{padding:"9px 13px",color:C.textSub}}>{r.producto}</td>
                    <td style={{padding:"9px 13px",fontWeight:700,color:C.blue900}}>{fmt(r.kilos)} kg</td>
                    <td style={{padding:"9px 13px",color:C.textMut}}>{r.num_pesajes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PanelCard>

      {/* Por turno */}
      <PanelCard title="Producción por Turno" icon={<TrendingUp size={15} color={C.blue500}/>}>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
            {[{k:"fecha_desde",l:"Desde",type:"date"},{k:"fecha_hasta",l:"Hasta",type:"date"},{k:"lote_id",l:"Lote ID",type:"number"}].map(({k,l,type})=>(
              <div key={k} style={{flex:1,minWidth:140}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>{l}</label>
                <input type={type||"text"} value={filtTurno[k]||""} onChange={e=>setFiltTurno(p=>({...p,[k]:e.target.value}))} style={iS}/>
              </div>
            ))}
            <button onClick={buscarTurno} style={{padding:"10px 18px",background:C.blue900,border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Buscar</button>
          </div>
          {porTurno.length>0&&(
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:C.blue900}}>
                {["Turno","Supervisor","Lote","Inicio","Fin","Producidos","Desecho","Pesajes"].map(h=>(
                  <th key={h} style={{padding:"9px 13px",textAlign:"left",fontSize:11,fontWeight:700,color:C.blue300,letterSpacing:.4}}>{h.toUpperCase()}</th>
                ))}
              </tr></thead>
              <tbody>
                {porTurno.map((r,i)=>(
                  <tr key={i} className="row" style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"9px 13px",fontWeight:700,color:C.blue900}}>{r.turno}</td>
                    <td style={{padding:"9px 13px",color:C.textSub,fontSize:12}}>{r.supervisor}</td>
                    <td style={{padding:"9px 13px"}}><span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:700,background:C.blue50,color:C.blue700}}>{r.lote}</span></td>
                    <td style={{padding:"9px 13px",color:C.textMut,fontSize:12}}>{fmtFecha(r.hora_inicio)}</td>
                    <td style={{padding:"9px 13px",color:C.textMut,fontSize:12}}>{r.hora_fin?fmtFecha(r.hora_fin):"Abierto"}</td>
                    <td style={{padding:"9px 13px",fontWeight:700,color:"#059669"}}>{fmt(r.kilos_producidos)} kg</td>
                    <td style={{padding:"9px 13px",fontWeight:700,color:"#dc2626"}}>{fmt(r.kilos_desecho)} kg</td>
                    <td style={{padding:"9px 13px",color:C.textMut}}>{r.num_pesajes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PanelCard>
    </div>
  );
}