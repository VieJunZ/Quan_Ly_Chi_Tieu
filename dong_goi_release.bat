@echo off
chcp 65001 >nul
setlocal

set "TAG=v1.0.0-sprint3"
if not "%~1"=="" set "TAG=%~1"
set "OUTPUT_ZIP=%~dp0thuchi-%TAG%-bundle.zip"

echo ========================================================
echo  Đóng gói bản Release: %TAG%
echo ========================================================
echo Đang nén các thành phần chính vào %OUTPUT_ZIP%...

powershell -NoProfile -Command ^
  "Compress-Archive -Path '%~dp0backend', '%~dp0frontend', '%~dp0database', '%~dp0docs', '%~dp0chay_thu_chi.bat', '%~dp0kiem_thu_thu_chi.bat', '%~dp0README.md', '%~dp0HUONG_DAN_THU_CHI.md', '%~dp0preview_server.js' -DestinationPath '%OUTPUT_ZIP%' -Force"

if errorlevel 1 (
  echo [LỖI] Đóng gói thất bại!
  exit /b 1
)

echo.
echo [THÀNH CÔNG] Đã tạo file: %OUTPUT_ZIP%
echo Bạn có thể tải file này lên mục Releases trên GitHub:
echo https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/releases/new?tag=%TAG%
echo ========================================================

