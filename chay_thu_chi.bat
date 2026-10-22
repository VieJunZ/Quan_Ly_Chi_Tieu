@echo off
REM ===========================================================================
REM  chay_thu_chi.bat - Chạy app Quản lý thu chi (giao diện mới ở /app) trên máy cá nhân
REM
REM   1. Kiểm tra Node.js và SQL Server
REM   2. Tạo CSDL so_chi_tri_db nếu chưa có (database\mo_rong\setup_mo_rong.bat)
REM   3. Cài thư viện lần đầu, chạy máy chủ trong cửa sổ riêng (cổng 8090)
REM   4. Mở trình duyệt, in địa chỉ để mở bằng điện thoại cùng wifi
REM
REM  Cách dùng:  chay_thu_chi.bat             -> chạy bình thường
REM              chay_thu_chi.bat dienthoai   -> mở khung xem như trên điện thoại
REM              chay_thu_chi.bat taolai      -> tạo lại CSDL từ đầu (mất dữ liệu thử)
REM              chay_thu_chi.bat kiemthu     -> chạy kiểm thử tự động rồi thoát
REM              chay_thu_chi.bat chiutai     -> chạy trên mọi nhân CPU (npm run start:cluster), chịu đông người
REM  Tắt máy chủ: đóng cửa sổ "ThuChi - May chu".
REM ===========================================================================
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "PORT=8090"
set "DB_SERVER=(localdb)\MSSQLLocalDB"
set "DB_NAME=so_chi_tri_db"
set "MODE=%~1"

echo.
echo ===== 1/4 Kiểm tra công cụ
where node >nul 2>&1 || goto :no_node
for /f "delims=" %%v in ('node -v') do echo Node.js %%v
where sqlcmd >nul 2>&1 || goto :no_sqlcmd
echo Đã có sqlcmd.

if not exist "%BACKEND%\node_modules" call :install || goto :fail

if /i "%MODE%"=="kiemthu" (
    call "%ROOT%kiem_thu_thu_chi.bat"
    exit /b
)

echo.
echo ===== 2/4 Cơ sở dữ liệu %DB_NAME%
REM LocalDB tự tắt khi lâu không dùng, lần mở lại mất 10-30 giây nên phải chờ nó sẵn sàng
sqllocaldb start MSSQLLocalDB >nul 2>&1
set /a DB_TRY=0
:wait_db
sqlcmd -S "%DB_SERVER%" -E -l 10 -Q "SELECT 1" >nul 2>&1 && goto :db_ready
set /a DB_TRY+=1
REM Sau 3 lần không được: LocalDB thường bị kẹt tiến trình cũ (máy ngủ, tắt máy đột ngột) nên dừng hẳn rồi bật lại
if %DB_TRY% EQU 3 (
    echo LocalDB không phản hồi, đang khởi động lại...
    sqllocaldb stop MSSQLLocalDB -k >nul 2>&1
    taskkill /f /im sqlservr.exe /fi "USERNAME eq %USERNAME%" >nul 2>&1
    sqllocaldb start MSSQLLocalDB >nul 2>&1
)
if %DB_TRY% GEQ 8 goto :db_down
ping -n 3 127.0.0.1 >nul
goto :wait_db
:db_ready
if /i "%MODE%"=="taolai" goto :setup_db
sqlcmd -S "%DB_SERVER%" -E -l 30 -h -1 -W -Q "SET NOCOUNT ON; SELECT CASE WHEN DB_ID('%DB_NAME%') IS NULL THEN 'CHUA_CO' ELSE 'DA_CO' END" 2>nul | findstr "DA_CO" >nul
if not errorlevel 1 (
    echo CSDL đã có, dùng tiếp dữ liệu cũ.
    REM Bổ sung bảng, chỉ mục mới nếu có; chạy lại nhiều lần không sao, không đụng dữ liệu
    sqlcmd -S "%DB_SERVER%" -E -b -I -f 65001 -W -v DB_NAME=%DB_NAME% -i "%ROOT%database\mo_rong\mo_rong_bang.sql" >nul 2>&1
    goto :start_server
)
:setup_db
echo Tạo CSDL, mất khoảng 30 giây...
call "%ROOT%database\mo_rong\setup_mo_rong.bat" "%DB_SERVER%" %DB_NAME%
if errorlevel 1 goto :db_error

:start_server
echo.
echo ===== 3/4 Chạy máy chủ ở cổng %PORT%
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
    echo Cổng %PORT% đang có máy chủ chạy, dùng luôn máy chủ đó.
    goto :wait_server
)
set "NPM_SCRIPT=start"
if /i "%MODE%"=="chiutai" set "NPM_SCRIPT=run start:cluster"
start "ThuChi - May chu" /d "%BACKEND%" cmd /k "set PORT=%PORT%&& set DB_NAME=%DB_NAME%&& npm %NPM_SCRIPT%"

:wait_server
set /a TRY=0
:wait_loop
curl -s -o nul "http://localhost:%PORT%/api/health" && goto :server_ready
set /a TRY+=1
if %TRY% GEQ 40 goto :server_error
ping -n 2 127.0.0.1 >nul
goto :wait_loop

:server_ready
echo Máy chủ sẵn sàng.

echo.
echo ===== 4/4 Mở app
set "URL=http://localhost:%PORT%/app/"
if /i "%MODE%"=="dienthoai" set "URL=http://localhost:%PORT%/app/mobile.html"
start "" "%URL%"
echo Máy tính : %URL%
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress"') do set "LAN_IP=%%i"
if defined LAN_IP echo Điện thoại: http://%LAN_IP%:%PORT%/app/   (điện thoại và máy tính chung wifi)
echo.
echo Mẹo: bấm "Dùng thử" để xem ngay với dữ liệu mẫu, không cần đăng ký.
echo Hướng dẫn chi tiết: HUONG_DAN_THU_CHI.md
echo.
pause
exit /b 0

:install
echo Cài thư viện lần đầu, mất khoảng 1 phút...
call npm install --prefix "%BACKEND%"
exit /b %errorlevel%

:no_node
echo LỖI: chưa cài Node.js. Tải bản LTS tại https://nodejs.org rồi chạy lại.
goto :fail

:no_sqlcmd
echo LỖI: chưa có SQL Server. Cài SQL Server Express hoặc LocalDB kèm công cụ sqlcmd.
echo       Xem mục "Cài đặt lần đầu" trong HUONG_DAN_THU_CHI.md
goto :fail

:db_down
echo LỖI: không kết nối được %DB_SERVER% sau khoảng 1 phút, kể cả khi đã khởi động lại.
echo       Thử khởi động lại máy tính rồi chạy lại file này.
goto :fail

:db_error
echo LỖI: tạo CSDL thất bại, xem thông báo ở trên.
goto :fail

:server_error
echo LỖI: máy chủ không phản hồi sau 40 giây, xem cửa sổ "ThuChi - May chu".
goto :fail

:fail
echo.
pause
exit /b 1
