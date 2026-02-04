# UniCode Frontend

Frontend React application cho dự án UniCode.

## Công nghệ sử dụng

- **React 18** - UI library
- **Vite** - Build tool và dev server
- **React Router** - Routing
- **Axios** - HTTP client
- **CSS3** - Styling

## Cài đặt

```bash
npm install
```

## Chạy development server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

## Build cho production

```bash
npm run build
```

File build sẽ được tạo trong thư mục `dist/`

## Cấu trúc thư mục

```
frontend/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React contexts (AuthContext)
│   ├── pages/          # Page components (Login, Home)
│   ├── services/       # API services
│   ├── App.jsx         # Main App component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## Environment Variables

Tạo file `.env` trong thư mục `frontend/`:

```
VITE_API_BASE_URL=http://localhost:8080
```

## Tính năng

- ✅ Đăng nhập với username/password
- ✅ Đăng nhập với Google OAuth
- ✅ Ghi nhớ đăng nhập
- ✅ Protected routes
- ✅ Token management (localStorage/sessionStorage)
- ✅ Responsive design
- ✅ Error handling
