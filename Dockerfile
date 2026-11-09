FROM mcr.microsoft.com/mssql/server:2022-latest

USER root

# Cài đặt Node.js 20 LTS và các công cụ hỗ trợ
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    ca-certificates \
    dos2unix \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cấp toàn quyền cho thư mục dữ liệu SQL Server (để chạy mượt trên mọi user của Cloud)
RUN chmod -R 777 /var/opt/mssql

# Cài đặt thư viện Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy toàn bộ mã nguồn
COPY . .

# Chuẩn hóa kịch bản chạy theo định dạng Linux (LF) và cấp quyền thực thi
RUN dos2unix start.sh && chmod +x start.sh && chmod -R 777 /app

# Mở cổng tiêu chuẩn: 7860 (Hugging Face Spaces), 8080 (Render / Local Docker), 1433 (SQL Server)
EXPOSE 7860 8080 1433

# Cấu hình biến môi trường mặc định
ENV PORT=7860 \
    ACCEPT_EULA=Y \
    SA_PASSWORD=SoChiTieu@2026StrongPass \
    MSSQL_PID=Developer \
    DB_SERVER=localhost \
    DB_NAME=so_chi_tri_db \
    DB_USER=sa \
    DB_PASS=SoChiTieu@2026StrongPass \
    DB_PORT=1433 \
    DB_ENCRYPT=false \
    NODE_ENV=production

CMD ["./start.sh"]

