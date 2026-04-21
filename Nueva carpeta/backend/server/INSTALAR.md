# TR3S AL MAR — Instrucciones de Instalación

## Instalación nueva
```bash
cd server
npm install
psql -U postgres -c "CREATE DATABASE tresalmar_produccion;"
psql -U postgres -d tresalmar_produccion -f sql/schema.sql
node setup-passwords.js
npm start   # Puerto 4001
```

## Migración (BD ya existente)
Ejecutar solo las líneas del final de `sql/schema.sql` que dicen `ALTER TABLE`:
```bash
psql -U postgres -d tresalmar_produccion -f sql/schema.sql
```
Los `CREATE TABLE IF NOT EXISTS` y `ALTER TABLE IF NOT EXISTS` no rompen nada existente.

## Variables de entorno (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tresalmar_produccion
DB_USER=postgres
DB_PASS=tu_password
JWT_SECRET=clave_secreta_fuerte
PORT=4001
CLIENT_URL=http://localhost:5174
```

## Frontend
```bash
cd client
npm install
npm run dev   # Puerto 5174
```

## Novedades v5.3
- **3 temperaturas pre-túnel** obligatorias antes de marcar carro como listo
- **Etiqueta Zebra 10×10** bilingüe (ES/EN) para impresora térmica
- **Patente Rampla** en recepción de camión
- **Upload fotos/documentos** en recepción (jpg, png, pdf, doc, xlsx — máx 20MB)
- **Historial de recepciones** con archivos descargables
- **Comprobante imprimible** de recepción del camión
- **5 Formularios HACCP** digitales: PCC1 Recepción MP, Monitoreo Temperatura, Empaque, Congelación, Despacho
- **Cadena de kg blindada** — inventario toma kg exactos de las cajas del carro
- **Configuración** de productos, calibres, líneas y túneles sin tocar BD
