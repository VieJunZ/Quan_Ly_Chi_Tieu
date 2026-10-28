@echo off
REM ===========================================================================
REM  setup_mo_rong.bat
REM  Tạo CSDL thử nghiệm riêng (mặc định so_chi_tri_db) gồm:
REM    - phần CSDL gốc của nhóm (chạy lại đúng các file .sql ở thư mục database)
REM    - phần mở rộng: bảng, thủ tục và kiểm thử trong thư mục mo_rong
REM  Không đụng tới CSDL quan_ly_chi_tieu_db của nhóm.
REM
REM  Cách dùng:
REM    setup_mo_rong.bat                                   -> (localdb)\MSSQLLocalDB, so_chi_tri_db
REM    setup_mo_rong.bat localhost\SQLEXPRESS              -> instance khác
REM    setup_mo_rong.bat "(localdb)\MSSQLLocalDB" ten_db   -> đặt tên CSDL khác
REM ===========================================================================
chcp 65001 >nul
setlocal

set "SERVER=%~1"
if "%SERVER%"=="" set "SERVER=(localdb)\MSSQLLocalDB"
set "DB_NAME=%~2"
if "%DB_NAME%"=="" set "DB_NAME=so_chi_tri_db"

set "MO_RONG=%~dp0"
set "GOC=%~dp0.."
set "TAM=%TEMP%\so_chi_setup_%RANDOM%"

echo Máy chủ: %SERVER%
echo CSDL   : %DB_NAME%

echo %SERVER% | findstr /i "(localdb)" >nul
if not errorlevel 1 (
    sqllocaldb start MSSQLLocalDB >nul 2>&1
)

mkdir "%TAM%" >nul 2>&1

REM Chép script gốc sang thư mục tạm, đổi tên CSDL, giữ nguyên mã UTF-8
for %%f in (create_database.sql create_tables.sql seed_categories.sql procedures.sql test_database.sql) do (
    powershell -NoProfile -Command "$t = [IO.File]::ReadAllText('%GOC%\%%f', [Text.Encoding]::UTF8); [IO.File]::WriteAllText('%TAM%\%%f', $t.Replace('quan_ly_chi_tieu_db', '%DB_NAME%'), (New-Object Text.UTF8Encoding $false))"
    if errorlevel 1 goto :error
)

REM Chép script mở rộng sang thư mục tạm, đổi tên CSDL, giữ nguyên mã UTF-8
for %%f in (mo_rong_bang.sql mo_rong_thu_tuc.sql kiem_thu_mo_rong.sql) do (
    powershell -NoProfile -Command "$t = [IO.File]::ReadAllText('%MO_RONG%%%f', [Text.Encoding]::UTF8); [IO.File]::WriteAllText('%TAM%\%%f', $t.Replace('so_chi_tri_db', '%DB_NAME%'), (New-Object Text.UTF8Encoding $false))"
    if errorlevel 1 goto :error
)

for %%f in (create_database.sql create_tables.sql seed_categories.sql procedures.sql test_database.sql) do (
    echo.
    echo ===== [gốc] %%f
    sqlcmd -S "%SERVER%" -E -b -I -f 65001 -W -i "%TAM%\%%f"
    if errorlevel 1 goto :error
)

for %%f in (mo_rong_bang.sql mo_rong_thu_tuc.sql kiem_thu_mo_rong.sql) do (
    echo.
    echo ===== [mở rộng] %%f
    sqlcmd -S "%SERVER%" -E -b -I -f 65001 -W -i "%TAM%\%%f"
    if errorlevel 1 goto :error
)

rmdir /s /q "%TAM%" >nul 2>&1
echo.
echo Hoàn tất: CSDL %DB_NAME% đã sẵn sàng và qua hết kiểm thử.
exit /b 0

:error
rmdir /s /q "%TAM%" >nul 2>&1
echo.
echo LỖI: dừng khởi tạo, xem thông báo ở trên.
exit /b 1
