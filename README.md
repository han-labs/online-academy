# Online Academy - PTUDW Final Project

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.18-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue.svg)](https://supabase.com/)

## 📋 Giới thiệu

Ứng dụng web **Online Academy** - nền tảng học trực tuyến tương tự Udemy, cho phép học viên đăng ký học các khóa học, giảng viên đăng tải nội dung, và quản trị viên quản lý hệ thống.

**Môn học:** Web Programming

**Mã lớp:** 251WEPR330479E_01FIE 

**Giảng viên hướng dẫn:** ThS. Ngô Ngọc Đăng Khoa

**Nhóm:** 11  

**Thành viên:**
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

**Backend:** Node.js v18+, Express.js v4.18, Handlebars (View Engine)

**Database:** PostgreSQL (qua Supabase), full-text search

**Frontend:** HTML5, CSS3, JavaScript, Bootstrap 5, Plyr.io (Video Player), TinyMCE/CKEditor (WYSIWYG)

**Authentication & Security:** bcrypt (mã hóa mật khẩu), JWT (JSON Web Tokens), Express Session, OTP Email verification

## 📦 Cài đặt

### Các bước cài đặt

1. **Clone repository**
```bash
git clone https://github.com/han-labs/online-academy.git
cd online-academy
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Chạy ứng dụng**
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
├── middlewares/    # Authentication, validation
├── models/         # Database models
├── routes/         # API routes
├── utils/          # Helper functions
├── static/         # Images, css
└── views/          # Handlebars templates
```

## 🌿 Git Workflow

### Branch Strategy
```
main/master    → Production code
develop        → Development branch
feature/*      → Feature branches
```

## Testing

### 📝 Tài khoản Demo

**Admin:**
- Email: admin@example.com
- Password: admin123

**Giảng viên:**
- Email: teacher@example.com
- Password: teacher123

**Học viên:**
- Email: student@example.com
- Password: student123


## 📄 License

MIT License - Online Academy Project

## 🙏 Tham khảo
- [Udemy](https://www.udemy.com) - UI/UX inspiration
- [Express.js Documentation](https://expressjs.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Plyr.io Documentation](https://plyr.io/)

---
© 2025 - Online Academy Project
