#!/bin/bash

# Script para iniciar el entorno de desarrollo expuesto a la red local

# Detener procesos en segundo plano al salir
trap 'kill $(jobs -p)' EXIT

echo "====== Iniciando Gestor de Turnos ======"

# 1. Iniciar backend usando el entorno virtual
if [ -d "backend/venv" ]; then
    echo "[Backend] Detectado entorno virtual en backend/venv. Activando..."
    source backend/venv/bin/activate
fi

echo "[Backend] Iniciando Uvicorn en http://0.0.0.0:8000..."
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
cd ..

# Esperar un momento a que el backend arranque
sleep 2

# 2. Iniciar frontend
echo "[Frontend] Iniciando Vite expuesto a la red..."
cd frontend
npm run dev

# Al salir del script (Ctrl+C), se ejecutará la trampa (trap) y detendrá el backend automáticamente.
