// frontend/js/config.js
// Cấu hình kết nối giữa Client (Frontend) và Server (Backend)

(function () {
  const host = window.location.hostname || "localhost";

  window.APP_CONFIG = {
    // Tự động nhận diện IP của máy tính khi truy cập từ điện thoại hoặc máy khác trong cùng mạng Wi-Fi/LAN
    apiBaseUrl: `http://${host}:8080`,

    // Đặt false để gọi trực tiếp Backend thật, true để dùng Mock demo offline
    useMock: false
  };
})();
