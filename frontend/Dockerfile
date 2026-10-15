FROM nginx:alpine

# Copy toàn bộ mã nguồn tĩnh của Frontend vào thư mục web root của Nginx
COPY . /usr/share/nginx/html

# Đổi cổng mặc định của Nginx từ 80 sang 3000 theo đúng docker-compose.yml
RUN sed -i 's/listen       80;/listen       3000;/g' /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
