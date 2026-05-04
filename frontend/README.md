# 🦐 Smart Shrimp Farming System - Frontend

Frontend của hệ thống quản lý ao tôm thông minh với AI dự đoán bệnh.

## 🚀 Tính năng chính

### 🔐 Admin (Quản trị viên)
- **Quản lý tài khoản**: Tạo, cập nhật, khóa/mở khóa, reset mật khẩu người dùng
- **Quản lý danh mục**: Ao nuôi, thức ăn, thuốc/vi sinh, loại bệnh, cảm biến
- **Quản lý hệ thống**: Sao lưu, khôi phục dữ liệu, xem audit log
- **Quản lý AI**: Quản lý dữ liệu huấn luyện, xem lịch sử dự đoán, cập nhật model

### 🧠 Manager (Quản lý trại)
- **Quản lý ao & mùa vụ**: Tạo, sửa, xóa ao và mùa vụ
- **Nhật ký canh tác**: Duyệt, từ chối, khóa nhật ký theo ngày
- **Quản lý công việc**: Tạo, giao, theo dõi tiến độ công việc
- **Quản lý chi phí**: Duyệt chi phí vận hành
- **Báo cáo & thống kê**: Xem dashboard, báo cáo tăng trưởng, FCR, lợi nhuận

### 👷 Staff (Nhân viên vận hành)
- **Ao phụ trách**: Xem danh sách ao được phân công
- **Nhật ký canh tác**: Tạo và sửa nhật ký (trước khi duyệt)
- **Nhập dữ liệu**: Nhập dữ liệu môi trường thủ công
- **Công việc**: Xem công việc, cập nhật tiến độ, upload ảnh
- **Báo cáo bệnh**: Chụp ảnh, gửi dữ liệu, xem kết quả AI

## 📋 Yêu cầu hệ thống

- Node.js 14.0+ 
- npm 6.0+
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🛠️ Cài đặt

### 1. Clone hoặc tải project

```bash
cd frontend
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình biến môi trường

Tạo file `.env` (đã có sẵn mẫu):

```
REACT_APP_API_URL=http://localhost:3000/api
```

Thay đổi URL nếu backend chạy trên port khác hoặc server khác.

### 4. Chạy ứng dụng

```bash
npm start
```

Ứng dụng sẽ mở tại `http://localhost:3000`

## 🔐 Đăng nhập

### Tài khoản Demo

| Vai trò | Username | Password |
|---------|----------|----------|
| Admin   | admin    | 123456   |
| Manager | manager  | 123456   |
| Staff   | staff    | 123456   |

> ⚠️ **Lưu ý**: Đây là tài khoản demo cho development. Thay đổi mật khẩu trước khi sử dụng trong production.

## 📁 Cấu trúc thư mục

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/          # Các component tái sử dụng
│   │   ├── ProtectedRoute.js
│   │   ├── Header.js
│   │   └── Sidebar.js
│   ├── context/             # React Context
│   │   └── AuthContext.js
│   ├── pages/               # Các trang
│   │   ├── Login.js
│   │   ├── Register.js
│   │   ├── admin/           # Các trang Admin
│   │   ├── manager/         # Các trang Manager
│   │   └── staff/           # Các trang Staff
│   ├── services/            # API services
│   │   └── api.js
│   ├── styles/              # CSS styles
│   │   ├── global.css
│   │   ├── auth.css
│   │   ├── header.css
│   │   ├── sidebar.css
│   │   └── dashboard.css
│   ├── App.js               # Main app component
│   └── index.js             # Entry point
├── package.json
├── .env                      # Biến môi trường
└── README.md
```

## 🔌 API Integration

Frontend gửi request tới backend qua các service API. API base URL được cấu hình trong `.env`:

```
REACT_APP_API_URL=http://localhost:3000/api
```

Tất cả các request API được xử lý trong file `src/services/api.js` với:
- Tự động thêm JWT token vào header
- Xử lý lỗi 401 (redirect về login)
- Interceptor request/response

## 🎨 Giao diện

### Màu sắc
- Xanh chính: `#2563eb`
- Xanh đậm: `#1e40af`
- Xanh nhạt: `#dbeafe`
- Thành công: `#16a34a`
- Cảnh báo: `#ea580c`
- Lỗi: `#dc2626`

### Component chính
- **Header**: Logo, menu người dùng
- **Sidebar**: Navigation menu (có thể thu gọn)
- **Dashboard**: Thống kê, hành động nhanh
- **Tables**: Danh sách dữ liệu
- **Modals**: Tạo/sửa form
- **Cards**: Hiển thị thông tin

## 🔐 Quản lý xác thực

### Login
- Username + Password
- Nhận JWT token
- Lưu vào localStorage
- Tự động refresh token khi hết hạn

### Logout
- Xóa token từ localStorage
- Redirect về trang login
- Clear user state

### Protected Routes
- Kiểm tra authentication
- Kiểm tra role (Admin/Manager/Staff)
- Redirect nếu không có quyền

## 🚀 Build cho production

```bash
npm run build
```

Tạo folder `build/` chứa các file optimized ready để deploy.

## 🐛 Troubleshooting

### Lỗi "Cannot find module"
```bash
# Xóa node_modules và cài lại
rm -rf node_modules
npm install
```

### Backend không kết nối
- Kiểm tra URL trong `.env`
- Backend đang chạy trên port 3000?
- CORS được cấu hình đúng?

### Login không thành công
- Kiểm tra tài khoản demo có tồn tại?
- Backend có chạy?
- API endpoint `/auth/login` hoạt động?

## 📝 Development Tips

### Chế độ development
```bash
npm start
```

### Hot reload
- Các thay đổi file sẽ tự động reload
- Xem lỗi trong console của browser

### Redux DevTools (nếu dùng Redux)
- Chrome extension hỗ trợ debug state

## 🔄 Quy trình vận hành

1. **Người dùng đăng nhập** → Nhận JWT token
2. **Hệ thống kiểm tra role** → Redirect tới dashboard phù hợp
3. **Điều hành** → Sử dụng các tính năng theo role
4. **Gửi request** → API servers trả về dữ liệu
5. **Cập nhật giao diện** → Hiển thị kết quả

## 📞 Hỗ trợ

Liên hệ: nguyenthienan@example.com

## 📄 License

MIT License - Xem FILE LICENSE để chi tiết

---

**🦐 Smart Shrimp Farming System** - Hệ thống quản lý ao tôm thông minh
