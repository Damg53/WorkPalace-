# Script para iniciar completo WorkPalace en Windows

Write-Host "🚀 Iniciando WorkPalace..." -ForegroundColor Green
Write-Host ""

Write-Host "📦 Paso 1: Iniciando Docker (PostgreSQL)..." -ForegroundColor Cyan
docker-compose up -d

Write-Host ""
Write-Host "🔄 Esperando a que PostgreSQL esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "📊 Paso 2: Verificando base de datos..." -ForegroundColor Cyan
node server/test-connection.js

Write-Host ""
Write-Host "🖥️  Paso 3: Iniciando servidor backend en nueva terminal..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run server"

Write-Host ""
Start-Sleep -Seconds 2

Write-Host "⚡ Paso 4: Iniciando React en nueva terminal..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

Write-Host ""
Write-Host "✅ WorkPalace iniciado correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Abre en tu navegador: http://localhost:5173" -ForegroundColor Magenta
Write-Host "📊 Backend en: http://localhost:3001" -ForegroundColor Magenta
Write-Host "📌 Los servidores están corriendo en terminales separadas" -ForegroundColor Yellow
