@echo off
setlocal
chcp 65001 >nul

echo ========================================================
echo  Day commit va Release Tag len GitHub
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
echo Dang day code va tag len GitHub...
echo.

"%GIT_EXE%" push origin main --tags

if errorlevel 1 (
    echo.
    echo [LOI] Push khong thanh cong. Vui long kiem tra ket noi mang hoac xac thuc GitHub.
) else (
    echo.
    echo ========================================================
    echo [THANH CONG] Da day code va tag v1.0.0-sprint3 len GitHub!
    echo Theo doi tien trinh Build va Release tai:
    echo   https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/actions
    echo   https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/releases
    echo ========================================================
)

echo.
pause