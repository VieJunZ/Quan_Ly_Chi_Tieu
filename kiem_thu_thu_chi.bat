@echo off
REM ===========================================================================
REM  kiem_thu_thu_chi.bat - Chạy toàn bộ kiểm thử Quản lý thu chi rồi báo kết quả
REM
REM   1. Kiểm thử đơn vị (npm test): hiểu câu nói, đọc SMS, thú cưng
REM   2. Kiểm thử CSDL phần mở rộng (database\mo_rong\kiem_thu_mo_rong.sql)
REM   3. Kiểm thử API: bật máy chủ tạm ở cổng 8099, chạy backend\tests\api\kiem_thu_api.mjs,
REM      tắt máy chủ và xóa các tài khoản thử "kt_api_..."
REM ===========================================================================
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "TEST_PORT=8099"
set "DB_SERVER=(localdb)\MSSQLLocalDB"
set "DB_NAME=so_chi_tri_db"
set "KQ_DONVI=LỖI"
set "KQ_CSDL=LỖI"
set "KQ_API=LỖI"

where node >nul 2>&1 || (echo LỖI: chưa cài Node.js. & goto :end)
where sqlcmd >nul 2>&1 || (echo LỖI: chưa có sqlcmd. & goto :end)
if not exist "%BACKEND%\node_modules" call npm install --prefix "%BACKEND%"

REM LocalDB tự tắt khi lâu không dùng, lần mở lại mất 10-30 giây nên phải chờ nó sẵn sàng
echo Đang bật SQL Server LocalDB...
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
if %DB_TRY% GEQ 8 (echo LỖI: không kết nối được %DB_SERVER% sau khoảng 1 phút, kể cả khi đã khởi động lại. Thử khởi động lại máy tính. & goto :end)
ping -n 3 127.0.0.1 >nul
goto :wait_db
:db_ready
echo SQL Server đã sẵn sàng.
sqlcmd -S "%DB_SERVER%" -E -l 30 -h -1 -W -Q "SET NOCOUNT ON; SELECT CASE WHEN DB_ID('%DB_NAME%') IS NULL THEN 'CHUA_CO' ELSE 'DA_CO' END" 2>nul | findstr "DA_CO" >nul
if errorlevel 1 (
    echo Chưa có CSDL, đang tạo...
    call "%ROOT%database\mo_rong\setup_mo_rong.bat" "%DB_SERVER%" %DB_NAME%
)

echo.
echo ===== 1/3 Kiểm thử đơn vị
pushd "%BACKEND%"
call npm test
if not errorlevel 1 set "KQ_DONVI=ĐẠT"
popd

echo.
echo ===== 2/3 Kiểm thử CSDL phần mở rộng
sqlcmd -S "%DB_SERVER%" -E -l 30 -b -f 65001 -W -v DB_NAME=%DB_NAME% -i "%ROOT%database\mo_rong\kiem_thu_mo_rong.sql"
if not errorlevel 1 set "KQ_CSDL=ĐẠT"

echo.
echo ===== 3/3 Kiểm thử API (máy chủ tạm cổng %TEST_PORT%)
netstat -ano | findstr /r /c:":%TEST_PORT% .*LISTENING" >nul
if not errorlevel 1 (
    echo Cổng %TEST_PORT% đang bị dùng, bỏ qua phần API.
    goto :summary
)
pushd "%BACKEND%"
start "ThuChi - May chu kiem thu" /min cmd /c "set PORT=%TEST_PORT%&& set NODE_ENV=test&& set DB_NAME=%DB_NAME%&& node src\server.js"
set /a TRY=0
:wait_loop
curl -s -o nul "http://localhost:%TEST_PORT%/api/health" && goto :api_run
set /a TRY+=1
if %TRY% GEQ 40 (echo LỖI: máy chủ tạm không chạy được. & popd & goto :stop_server)
ping -n 2 127.0.0.1 >nul
goto :wait_loop
:api_run
node tests\api\kiem_thu_api.mjs http://localhost:%TEST_PORT%
if not errorlevel 1 set "KQ_API=ĐẠT"
popd

:stop_server
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%TEST_PORT% .*LISTENING"') do taskkill /pid %%p /f >nul 2>&1
sqlcmd -S "%DB_SERVER%" -E -I -l 30 -d %DB_NAME% -Q "SET NOCOUNT ON; DELETE FROM dbo.users WHERE username LIKE 'kt[_]api[_]%%'" >nul 2>&1
echo Đã tắt máy chủ tạm và xóa tài khoản thử.

:summary
echo.
echo ===== KẾT QUẢ
echo   Kiểm thử đơn vị : %KQ_DONVI%
echo   Kiểm thử CSDL   : %KQ_CSDL%
echo   Kiểm thử API    : %KQ_API%
if "%KQ_DONVI%%KQ_CSDL%%KQ_API%"=="ĐẠTĐẠTĐẠT" (echo TẤT CẢ ĐỀU ĐẠT.) else (echo CÓ PHẦN LỖI, xem ở trên.)

:end
echo.
pause
