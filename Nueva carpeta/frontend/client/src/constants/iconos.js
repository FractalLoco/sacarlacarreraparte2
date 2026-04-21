import { Warehouse, Package, Archive, Layers, Boxes, MapPin } from "lucide-react";
export const ICONOS_BODEGA = [
  {id:"warehouse",I:Warehouse},{id:"package",I:Package},{id:"archive",I:Archive},
  {id:"layers",I:Layers},{id:"boxes",I:Boxes},{id:"mappin",I:MapPin},
];
export const getIcono = (id) => ICONOS_BODEGA.find(b=>b.id===id)||ICONOS_BODEGA[0];
