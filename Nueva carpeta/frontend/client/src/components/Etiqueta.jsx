/**
 * Etiqueta 10cm x 10cm para TR3S AL MAR
 * Formato: 254 x 254 pixels (72 DPI) o 95 x 95 mm
 */

export function Etiqueta({ lote, codigo, kilos, producto, calibre }) {
  return (
    <div style={{
      width: "254px",
      height: "254px",
      padding: "12px",
      border: "2px solid #000",
      background: "#fff",
      fontFamily: "monospace",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxSizing: "border-box",
      fontSize: "11px",
      lineHeight: "1.2",
    }}>
      {/* Logo/Título */}
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "14px", borderBottom: "1px solid #000", paddingBottom: "4px" }}>
        TR3S AL MAR
      </div>

      {/* Datos principales */}
      <div>
        <div><strong>LOTE:</strong> {lote}</div>
        <div><strong>CAJA:</strong> {codigo}</div>
        <div><strong>KG:</strong> {typeof kilos === "number" ? kilos.toFixed(2) : kilos}</div>
        {producto && <div><strong>PROD:</strong> {producto}</div>}
        {calibre && <div><strong>CAL:</strong> {calibre}</div>}
      </div>

      {/* Fecha */}
      <div style={{ textAlign: "center", fontSize: "9px", borderTop: "1px solid #000", paddingTop: "4px" }}>
        {new Date().toLocaleDateString("es-CL")}
      </div>
    </div>
  );
}

export function HojaEtiquetas({ cajas }) {
  // Imprime máximo 4 etiquetas por hoja (2x2)
  return (
    <div style={{
      padding: "20px",
      background: "#fff",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
      width: "297mm", // A4 ancho
      height: "210mm", // A4 alto
      margin: "0 auto",
    }}>
      {cajas.slice(0, 4).map((c, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Etiqueta
            lote={c.lote_codigo || c.lote_id}
            codigo={c.numero_caja}
            kilos={c.kilos_netos}
            producto={c.producto_tipo_nombre}
            calibre={c.calibre_nombre}
          />
        </div>
      ))}
    </div>
  );
}

export default Etiqueta;
