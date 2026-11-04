@echo off
chcp 65001 >nul
setlocal

echo ========================================================
echo  Đẩy commit và Release Tag v1.0.0-sprint3 lên GitHub
echo ========================================================
echo.

REM 1. Tìm đường dẫn git.exe
set "GIT_CMD=git"
where git >nul 2>&1
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
    set "GIT_CMD=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
  ) else if exist "C:\Program Files\Git\cmd\git.exe" (
    set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
  ) else (
    echo [LỖI] Không tìm thấy git.exe trên máy tính!
    echo Vui lòng kiểm tra lại cài đặt Git.
    pause
    exit /b 1
  )
)

echo Đang dùng Git: "%GIT_CMD%"
echo Đang đẩy nhánh main và tags lên GitHub (origin)...
echo.

"%GIT_CMD%" push origin main --tags

if errorlevel 1 (
  echo.
  echo [LỖI] Quá trình push thất bại. Có thể do lỗi mạng hoặc chưa đăng nhập tài khoản GitHub.
  echo Vui lòng kiểm tra lại cửa sổ xác thực trình duyệt hoặc cấu hình quyền truy cập.
) else (
  echo.
  echo ========================================================
  echo [THÀNH CÔNG] Đã đẩy code và Release Tag lên GitHub!
  echo Kiểm tra tiến trình tự động build & release tại:
  echo   👉 https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/actions
  echo   👉 https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/releases
  echo ========================================================
)

echo.
pause
