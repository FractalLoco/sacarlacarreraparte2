import { useState, useCallback } from "react";
export const useToast = () => {
  const [toast, setToast] = useState(null);
  const mostrar = useCallback((msg, tipo="success") => {
    setToast({msg,tipo});
    setTimeout(()=>setToast(null),3200);
  },[]);
  return { toast, mostrar };
};
