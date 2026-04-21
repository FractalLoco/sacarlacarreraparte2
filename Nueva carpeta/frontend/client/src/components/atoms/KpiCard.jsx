import { useState, useEffect } from "react";
const GRAD = { blue:"linear-gradient(135deg,#0d2260,#1f4de0)", teal:"linear-gradient(135deg,#0f766e,#0d9488)", amber:"linear-gradient(135deg,#b45309,#d97706)", indigo:"linear-gradient(135deg,#4338ca,#6366f1)" };
export const KpiCard = ({icon:Icon,label,value,sub,accent="blue",delay=0}) => {
  const [vis,setVis]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVis(true),delay);return()=>clearTimeout(t);},[delay]);
  return <div style={{background:GRAD[accent],borderRadius:16,padding:20,color:"white",boxShadow:"0 4px 20px rgba(0,0,0,.15)",opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(16px)",transition:`opacity .5s ease ${delay}ms,transform .5s ease ${delay}ms`}}>
    <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
      <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon size={20} color="white"/></div>
      <div>
        <p style={{fontSize:11,color:"rgba(255,255,255,.7)",fontWeight:700,textTransform:"uppercase",letterSpacing:.6,marginBottom:4}}>{label}</p>
        <p style={{fontSize:26,fontWeight:800,lineHeight:1,color:"white"}}>{value}</p>
        {sub&&<p style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:5}}>{sub}</p>}
      </div>
    </div>
  </div>;
};