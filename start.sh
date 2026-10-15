#!/bin/bash
# Script para iniciar completo WorkPalace

echo "🚀 Iniciando WorkPalace..."
echo ""

# Función para manejar Ctrl+C
cleanup() {
  echo ""
  echo "⛔ Deteniendo servidores..."
  kill %1 %2 2>/dev/null
  echo "✅ Detenido"
  exit
}

trap cleanup SIGINT SIGTERM

echo "📦 Paso 1: Iniciando Docker (PostgreSQL)..."
docker-compose up -d

echo ""
echo "🔄 Esperando a que PostgreSQL esté listo..."
sleep 3

echo ""
echo "📊 Paso 2: Verificando base de datos..."
node server/test-connection.js

echo ""
echo "🖥️  Paso 3: Iniciando servidor backend..."
npm run server &
BACKEND_PID=$!

sleep 2

echo ""
echo "⚡ Paso 4: Iniciando React (frontend)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ WorkPalace iniciado correctamente!"
echo ""
echo "🌐 Abre en tu navegador: http://localhost:5173"
echo "📌 Presiona Ctrl+C para detener todos los servicios"
echo ""

# Mantener el script en ejecución
wait
