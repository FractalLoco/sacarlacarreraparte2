import { CheckCircle, AlertTriangle, X, Info } from "lucide-react";
const TIPOS = { success:{bg:"#059669",I:CheckCircle}, warning:{bg:"#d97706",I:AlertTriangle}, error:{bg:"#dc2626",I:X}, info:{bg:"#1f4de0",I:Info} };
export const Toast = ({msg,tipo="success"}) => {
  const {bg,I}=TIPOS[tipo]||TIPOS.success;
  return <div style={{position:"fixed",bottom:24,right:24,zIndex:999,display:"flex",alignItems:"center",gap:10,padding:"12px 20px",borderRadius:14,background:bg,color:"white",fontWeight:700,fontSize:13,fontFamily:"Plus Jakarta Sans,system-ui",boxShadow:"0 8px 30px rgba(0,0,0,.25)",animation:"slideUp .3s ease both"}}>
    <I size={15}/>{msg}
    <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
  </div>;
};