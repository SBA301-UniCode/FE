# Hướng dẫn chạy ứng dụng UniCode Frontend

## Bước 1: Cài đặt Node.js

Đảm bảo bạn đã cài đặt Node.js (phiên bản 16 trở lên).

Kiểm tra:
```bash
node --version
npm --version
```

Nếu chưa có, tải về tại: https://nodejs.org/

## Bước 2: Cài đặt dependencies

Mở terminal và chạy:

```bash
cd frontend
npm install
```

Lệnh này sẽ cài đặt tất cả các package cần thiết (React, Vite, Axios, React Router...)

## Bước 3: Chạy Backend Spring Boot

Trước tiên, bạn cần chạy backend Spring Boot:

1. Mở terminal mới
2. Di chuyển đến thư mục backend:
```bash
cd UniCode
```

3. Chạy Spring Boot application:
```bash
# Windows
mvnw.cmd spring-boot:run

# Linux/Mac
./mvnw spring-boot:run
```

Hoặc nếu bạn đã cài Maven:
```bash
mvn spring-boot:run
```

Backend sẽ chạy tại: `http://localhost:8080`

## Bước 4: Chạy Frontend React

Trong terminal khác (giữ backend đang chạy), chạy:

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:3000`

## Bước 5: Truy cập ứng dụng

Mở trình duyệt và truy cập:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html

## Các lệnh hữu ích

### Development
```bash
npm run dev          # Chạy dev server với hot reload
```

### Build
```bash
npm run build        # Build ứng dụng cho production
npm run preview      # Xem preview của build
```

### Lint
```bash
npm run lint         # Kiểm tra lỗi code
```

## Xử lý lỗi thường gặp

### Lỗi: "Cannot find module"
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

### Lỗi: Port đã được sử dụng
- Thay đổi port trong `vite.config.js` hoặc
- Đóng ứng dụng đang dùng port đó

### Lỗi: Không kết nối được backend
- Kiểm tra backend đã chạy tại `http://localhost:8080`
- Kiểm tra CORS settings trong Spring Boot
- Kiểm tra file `.env` có đúng `VITE_API_BASE_URL` không

## Cấu trúc thư mục

```
frontend/
├── src/
│   ├── components/     # Các component tái sử dụng
│   ├── contexts/      # React Context (AuthContext)
│   ├── pages/         # Các trang (Login, Home)
│   ├── services/      # API services
│   └── App.jsx        # Component chính
├── package.json       # Dependencies
└── vite.config.js     # Cấu hình Vite
```

## Tính năng

✅ Đăng nhập với username/password
✅ Đăng nhập với Google OAuth
✅ Protected routes
✅ Token management
✅ Responsive design
