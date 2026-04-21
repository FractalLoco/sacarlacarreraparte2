import { useState, useEffect } from "react";

// Hook para detectar tamaño de pantalla
export const useResponsive = () => {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return {
    isMobile: w < 640,
    isTablet: w < 1024,
    isDesktop: w >= 1024,
    w,
  };
};
