# Online Academy - PTUDW Final Project

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.18-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue.svg)](https://supabase.com/)

## 📋 Giới thiệu

Ứng dụng web **Online Academy** - nền tảng học trực tuyến tương tự Udemy, cho phép học viên đăng ký học các khóa học, giảng viên đăng tải nội dung, và quản trị viên quản lý hệ thống.

**Môn học:** Web Programming
**Mã lớp:** 251WEPR330479E_01FIE 
**Giảng viên hướng dẫn: ** ThS. Ngô Ngọc Đăng Khoa
**Nhóm:** 11  
**Thành viên:**
- Nhóm trưởng (Guest System + Integration)
- [Họ tên 3] - [MSSV] - Authentication & Student
- [Họ tên 3] - [MSSV] - Student Learning System
- [Họ tên 4] - [MSSV] - Teacher System
- [Họ tên 5] - [MSSV] - Admin System
- 23110019	Huỳnh Gia Hân
- 23110051	Trần Thị Tố Như
- 23110065	Mai Trần Thùy Trang
- 23110004	Võ Nguyễn Ngọc Bích
- 23110028	Trần Tuấn Kha

## ✨ Tính năng chính

### 🔓 Người dùng Guest
- Xem danh sách khóa học theo lĩnh vực (có phân trang)
- Tìm kiếm full-text với từ khóa gần đúng
- Xem chi tiết khóa học với preview một số chương
- Trang chủ với slideshow, carousel hiển thị khóa học nổi bật

### 👨‍🎓 Học viên (Student)
- Đăng ký tài khoản với xác thực OTP
- Mua và tham gia khóa học
- Xem video bài giảng với media player (Plyr.io)
- Quản lý watchlist (danh sách yêu thích)
- Đánh giá và feedback khóa học

### 👨‍🏫 Giảng viên (Teacher)
- Đăng khóa học với trình soạn thảo WYSIWYG
- Upload video bài giảng
- Quản lý và cập nhật nội dung khóa học
- Xem thống kê khóa học

### 👨‍💼 Quản trị viên (Admin)
- Quản lý lĩnh vực (categories)
- Quản lý khóa học (gỡ bỏ nếu vi phạm)
- Quản lý học viên và giảng viên
- Dashboard thống kê

## 🛠️ Công nghệ sử dụng

**Backend:**
- Node.js v18+
- Express.js v4.18
- Handlebars (View Engine)

**Database:**
- PostgreSQL (qua Supabase)
- Full-text search

**Frontend:**
- HTML5, CSS3, JavaScript
- Bootstrap 5
- Plyr.io (Video Player)
- TinyMCE/CKEditor (WYSIWYG)

**Authentication & Security:**
- bcrypt (mã hóa mật khẩu)
- JWT (JSON Web Tokens)
- Express Session
- OTP Email verification

## 📦 Cài đặt

### Yêu cầu hệ thống
- Node.js >= 18.0.0
- npm >= 9.0.0
- Tài khoản Supabase (PostgreSQL cloud)

### Các bước cài đặt

1. **Clone repository**
```bash
git clone https://github.com/[username]/online-academy-ptudw.git
cd online-academy-ptudw
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Cấu hình môi trường**
```bash
cp .env.example .env
```
Sau đó mở file `.env` và điền thông tin:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SESSION_SECRET=random_secret_string
```

4. **Khởi tạo database**
```bash
# Import schema và seed data từ folder database/
# Truy cập Supabase Dashboard > SQL Editor
# Copy nội dung từ database/schema.sql và chạy
# Tiếp tục với database/seeds/*.sql
```

5. **Chạy ứng dụng**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Truy cập: `http://localhost:3000`

## 🗂️ Cấu trúc thư mục

```
src/
├── config/         # Cấu hình database, passport
├── controllers/    # Business logic
├── middlewares/    # Authentication, validation
├── models/         # Database models
├── routes/         # API routes
├── services/       # External services (email, upload)
├── utils/          # Helper functions
└── views/          # Handlebars templates
```

## 🌿 Git Workflow

### Branch Strategy
```
main/master    → Production code
develop        → Development branch
feature/*      → Feature branches
```

### Quy trình làm việc

1. **Tạo nhánh feature mới**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/ten-chuc-nang
```

2. **Commit thường xuyên**
```bash
git add .
git commit -m "feat: mô tả ngắn gọn"
```

3. **Push và tạo Pull Request**
```bash
git push origin feature/ten-chuc-nang
```
Sau đó tạo PR trên GitHub để nhóm trưởng review

4. **Naming conventions**
- `feat: ...` - Tính năng mới
- `fix: ...` - Sửa lỗi
- `docs: ...` - Cập nhật tài liệu
- `style: ...` - Format code
- `refactor: ...` - Tái cấu trúc code

## 📚 Tài liệu

- [Hướng dẫn Setup](docs/SETUP.md)
- [Database Schema](docs/DATABASE.md)
- [Git Workflow](docs/WORKFLOW.md)
- [API Documentation](docs/API.md)

## 🧪 Testing

```bash
npm test
```

## 📝 Tài khoản Demo

**Admin:**
- Email: admin@example.com
- Password: admin123

**Giảng viên:**
- Email: teacher@example.com
- Password: teacher123

**Học viên:**
- Email: student@example.com
- Password: student123

## 🎯 Phân công nhiệm vụ

| Thành viên | Công việc | Tiến độ |
|------------|-----------|---------|
| Người 1 | Guest System | 🟡 In Progress |
| Người 2 | Auth & Student | 🟡 In Progress |
| Người 3 | Student Learning | 🔴 Not Started |
| Người 4 | Teacher System | 🔴 Not Started |
| Người 5 | Admin System | 🔴 Not Started |

## 🐛 Báo lỗi

Tạo issue trên GitHub hoặc liên hệ nhóm trưởng qua Email: huynhgiahan680@gmail.com / Zalo: 0346732411

## 📄 License

MIT License - PTUDW Final Project

## 🙏 Tham khảo

- [Udemy](https://www.udemy.com) - UI/UX inspiration
- [Express.js Documentation](https://expressjs.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Plyr.io Documentation](https://plyr.io/)

---
© 2025 - Online Academy PTUDW Project
