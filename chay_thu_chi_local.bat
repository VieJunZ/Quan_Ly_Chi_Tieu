@echo off
chcp 65001 >nul
title Quản Lý Chi Tiêu - Máy Chủ Nội Bộ (Local Server)
echo ======================================================================
echo          KHỞI ĐỘNG MÁY CHỦ QUẢN LÝ CHI TIÊU NỘI BỘ (LOCAL)
echo ======================================================================
echo.

set "NODE_EXE=D:\Nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

cd /d "%~dp0backend"

echo [*] Đang khởi động Backend Node.js tại cổng 8080...
echo [*] Kết nối CSDL: Microsoft SQL Server Cloud (SmarterASP.NET)...
echo.
echo ======================================================================
echo  👉 Mở trên máy tính này : http://localhost:8080
echo  👉 Mở trên điện thoại   : http://localhost:8080 (hoặc qua Wi-Fi)
echo ======================================================================
echo.
echo (Để tắt máy chủ, chỉ cần đóng cửa sổ này lại)
echo.

start "" "http://localhost:8080"
"%NODE_EXE%" src/server.js
pause
