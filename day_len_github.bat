@echo off
setlocal
chcp 65001 >nul

echo ========================================================
echo  Day nhanh feature/release-sprint3 len GitHub (Tao PR)
echo ========================================================
echo.

set "GIT_EXE=git"
where git >nul 2>&1
if errorlevel 1 (
    if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "GIT_EXE=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
    ) else if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
    ) else (
        echo [LOI] Khong tim thay git.exe tren he thong!
        pause
        exit /b 1
    )
)

echo Su dung: "%GIT_EXE%"
echo Dang day nhanh feature/release-sprint3 len GitHub...
echo.

"%GIT_EXE%" push -u origin feature/release-sprint3

if errorlevel 1 (
    echo.
    echo [LOI] Push khong thanh cong. Vui long kiem tra ket noi hoac xac thuc GitHub.
) else (
    echo.
    echo ========================================================
    echo [THANH CONG] Da day nhanh feature/release-sprint3 len GitHub!
    echo.
    echo Buoc tiep theo: Mo link sau de tao Pull Request vao nhanh main:
    echo   https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/compare/main...feature/release-sprint3?expand=1
    echo ========================================================
)

echo.
pause