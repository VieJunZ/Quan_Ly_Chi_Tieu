@echo off
REM ===========================================================================
REM  setup_database.bat
REM  Khởi tạo CSDL quan_ly_chi_tieu_db trên SQL Server rồi chạy kiểm thử.
REM
REM  Cách dùng (mở cmd tại thư mục database):
REM    setup_database.bat                        -> dùng (localdb)\MSSQLLocalDB
REM    setup_database.bat localhost\SQLEXPRESS   -> dùng instance khác
REM    setup_database.bat localhost sa MatKhau   -> đăng nhập bằng tài khoản SQL
REM ===========================================================================
chcp 65001 >nul
setlocal

set "SERVER=%~1"
if "%SERVER%"=="" set "SERVER=(localdb)\MSSQLLocalDB"

if "%~2"=="" (
    set "AUTH=-E"
) else (
    set "AUTH=-U %~2 -P %~3"
)

cd /d "%~dp0"
echo Máy chủ: %SERVER%

for %%f in (create_database.sql create_tables.sql seed_categories.sql procedures.sql test_database.sql) do (
    echo.
    echo ===== %%f
    sqlcmd -S "%SERVER%" %AUTH% -b -f 65001 -W -i "%%f"
    if errorlevel 1 goto :error
)

echo.
echo Hoàn tất: CSDL đã được khởi tạo và kiểm thử thành công.
exit /b 0

:error
echo.
echo LỖI: dừng khởi tạo, xem thông báo ở trên.
exit /b 1
