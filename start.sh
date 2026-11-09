#!/bin/bash
set -e

echo "========================================================="
echo "   QUAN LY THU CHI - ALL-IN-ONE CONTAINER KHOI DONG      "
echo "========================================================="

export ACCEPT_EULA=Y
export SA_PASSWORD="${DB_PASS:-SoChiTieu@2026StrongPass}"
export MSSQL_PID="Developer"

# 1. Bat Microsoft SQL Server 2022 o che do nen
echo "[1/3] Khoi dong Microsoft SQL Server 2022 o che do nen..."
/opt/mssql/bin/sqlservr &

# 2. Chay Node.js de tao CSDL so_chi_tri_db va 15 bang + 32 thu tuc
echo "[2/3] Kiem tra va nap CSDL SQL Server tu dong..."
export DB_SERVER=localhost
export DB_NAME=so_chi_tri_db
export DB_USER=sa
export DB_PASS="${SA_PASSWORD}"
export DB_PORT=1433
export DB_ENCRYPT=false

node backend/src/init_db.js

# 3. Khoi dong Web Server
PORT_TO_USE="${PORT:-7860}"
echo "[3/3] Khoi dong Web App & Backend API tren cong ${PORT_TO_USE}..."
export PORT=$PORT_TO_USE
export NODE_ENV=production

cd backend
exec node src/server.js

