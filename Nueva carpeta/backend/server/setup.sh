#!/bin/bash
set -e

echo "╔══════════════════════════════════════════╗"
echo "║  TR3S AL MAR — Setup de Producción      ║"
echo "╚══════════════════════════════════════════╝"

# 1. Dependencias
echo ""
echo "► Instalando dependencias Node.js..."
npm install

# 2. Carpeta uploads
mkdir -p uploads
echo "► Carpeta uploads/ creada"

# 3. .env
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "► Creado .env desde .env.example — ¡EDITAR ANTES DE CONTINUAR!"
  echo "  nano .env"
  exit 1
fi

# 4. Base de datos
echo ""
echo "► Aplicando schema a la base de datos..."
echo "  (requiere acceso a PostgreSQL)"
read -p "  ¿Aplicar schema? [s/N] " resp
if [[ "$resp" =~ ^[Ss]$ ]]; then
  source .env 2>/dev/null || true
  PGPASSWORD=$DB_PASS psql -h ${DB_HOST:-localhost} -U ${DB_USER:-postgres} \
    -d ${DB_NAME:-tresalmar_produccion} -f sql/schema.sql
  echo "  ✅ Schema aplicado"
fi

# 5. Passwords iniciales
echo ""
read -p "► ¿Crear usuarios iniciales? [s/N] " resp2
if [[ "$resp2" =~ ^[Ss]$ ]]; then
  node setup-passwords.js
fi

echo ""
echo "✅ Setup completado. Para iniciar:"
echo "   npm start         (producción)"
echo "   npm run dev       (desarrollo)"
