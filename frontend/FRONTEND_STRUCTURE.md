# Cấu trúc thư mục Frontend (UniCode)

## Tổ chức thư mục

```
frontend/src/
├── api/                    # Gọi API backend (chỉ frontend)
│   ├── client.js           # Axios instance + interceptors (token, 401)
│   ├── auth.js             # login, logout, refreshToken
│   ├── course.js            # getMyCourses (My Courses)
│   ├── user.js             # getMe (GET /api/v1/users/me)
│   └── index.js
├── components/
│   ├── layout/
│   │   ├── Header.jsx      # Nav chung: logo, menu theo role, đăng nhập/user
│   │   ├── Header.css
│   │   └── index.js
│   └── ProtectedRoute.jsx  # Bảo vệ route cần đăng nhập
├── contexts/
│   ├── AuthProvider.jsx    # Trạng thái auth + user, login/logout, fetch /me
│   ├── authContext.js      # Context object
│   └── useAuth.js          # Hook useAuth()
├── pages/
│   ├── LandingPage.jsx     # Trang chủ công khai (chưa đăng nhập vẫn xem)
│   ├── LandingPage.css
│   ├── Login.jsx
│   ├── Login.css
│   ├── OAuthCallback.jsx   # Xử lý redirect sau đăng nhập Google
│   ├── OAuthCallback.css
│   ├── Dashboard.jsx      # Trang sau khi đăng nhập (theo role)
│   ├── Dashboard.css
│   ├── MyCourses.jsx       # Lecturer/Admin: danh sách My Courses
│   └── MyCourses.css
├── services/
│   └── authService.js      # Re-export / tương thích (ưu tiên dùng api/)
├── App.jsx
├── main.jsx
└── index.css
```

## Luồng trang

| Đường dẫn      | Ai xem được     | Ghi chú                          |
|----------------|-----------------|-----------------------------------|
| `/`            | Mọi người       | Landing page (homepage)          |
| `/login`       | Mọi người       | Form đăng nhập / Google           |
| `/auth/callback` | Mọi người     | Redirect sau OAuth Google         |
| `/dashboard`   | Đã đăng nhập    | Trang nội bộ (ProtectedRoute)    |
| `/my-courses`  | Đã đăng nhập    | Lecturer/Admin: My Courses       |

## API đang dùng (không sửa backend)

- **POST** `/api/auth/login` — Đăng nhập (username, password)
- **GET** `/api/auth/logout` — Đăng xuất (cần token)
- **POST** `/api/auth/refresh-access-token` — Gia hạn token
- **GET** `/api/v1/users/me` — Lấy thông tin user + roles (cần token)
- **GET** `VITE_MY_COURSES_ENDPOINT` (mặc định: `/api/v1/courses/my-courses`) — Lấy My Courses (cần token)

Token được gửi kèm header: `Authorization: Bearer <accessToken>`.

## Cách thêm API mới

1. Tạo hoặc sửa file trong `src/api/` (ví dụ: `course.js`).
2. Dùng `import apiClient from './client'` rồi gọi `apiClient.get/post/...`.
3. Export từ `api/index.js` nếu cần.
