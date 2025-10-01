# 🚀 Hướng dẫn Setup Project cho Thành viên

## 📋 Yêu cầu trước khi bắt đầu

### Phần mềm cần cài đặt:
- ✅ **Node.js** (v18 trở lên) - [Download](https://nodejs.org/)
- ✅ **Git** - [Download](https://git-scm.com/)
- ✅ **Visual Studio Code** - [Download](https://code.visualstudio.com/)
- ✅ **Postman** (để test API) - [Download](https://www.postman.com/)

### Tài khoản cần có:
- GitHub account
- Quyền truy cập vào repository nhóm
- Thông tin Supabase (nhóm trưởng sẽ cung cấp)

---

## 🔧 Bước 1: Clone Repository

```bash
# Clone project về máy
git clone https://github.com/han-labs/online-academy.git

# Di chuyển vào thư mục project
cd online-academy

# Kiểm tra các nhánh hiện có
git branch -a
```

---

## 📦 Bước 2: Cài đặt Dependencies

```bash
# Cài đặt tất cả packages cần thiết
npm install

# Đợi quá trình cài đặt hoàn tất (2-3 phút)
```

**Lưu ý:** Nếu gặp lỗi, thử:
```bash
npm install --legacy-peer-deps
```

---

## ⚙️ Bước 3: Cấu hình Environment

1. Copy file `.env.example` thành `.env`:
```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

2. Mở file `.env` và điền thông tin (nhóm trưởng sẽ cung cấp):
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SESSION_SECRET=online-academy-secret-2024
```

---

## 🗄️ Bước 4: Setup Database (Chỉ làm 1 lần)

**Nhóm trưởng đã setup sẵn database, bạn chỉ cần:**

1. Truy cập Supabase Dashboard (link nhóm trưởng gửi)
2. Kiểm tra các bảng đã có trong **Table Editor**
3. Test connection bằng cách chạy:
```bash
npm run test-db
```

---

## ▶️ Bước 5: Chạy Project

```bash
# Chạy ở chế độ development (tự động restart khi có thay đổi)
npm run dev

# Hoặc chạy chế độ bình thường
npm start
```

Nếu thành công, bạn sẽ thấy:
```
Server running on port 3000
Connected to Supabase successfully
```

Mở trình duyệt và truy cập: **http://localhost:3000**

---

## 🌿 Bước 6: Git Workflow

### 6.1. Trước khi bắt đầu làm việc

```bash
# Checkout sang nhánh develop
git checkout develop

# Cập nhật code mới nhất
git pull origin develop

# Tạo nhánh feature mới cho công việc của bạn
git checkout -b feature/ten-chuc-nang-cua-ban
```

**Ví dụ đặt tên nhánh:**
- `feature/guest-homepage`
- `feature/student-watchlist`
- `feature/teacher-upload-video`
- `feature/admin-manage-users`

### 6.2. Trong quá trình làm việc

```bash
# Xem các file đã thay đổi
git status

# Thêm tất cả file đã thay đổi
git add .

# Hoặc thêm từng file cụ thể
git add src/controllers/student.controller.js

# Commit với message rõ ràng bằng tiếng anh
git commit -m "feat: add feature watchlist for student"

# Push lên GitHub
git push origin feature/ten-chuc-nang-cua-ban
```

**Quy tắc viết commit message:**
- `feat:` - Thêm tính năng mới
- `fix:` - Sửa lỗi
- `update:` - Cập nhật code
- `docs:` - Cập nhật tài liệu
- `style:` - Format code

**Commit thường xuyên!** Ít nhất 1-2 commit/ngày

### 6.3. Tạo Pull Request

1. Push code lên GitHub (như trên)
2. Truy cập repository trên GitHub
3. Nhấn nút **"Compare & pull request"**
4. Điền thông tin:
   - **Title:** Mô tả ngắn gọn
   - **Description:** Giải thích chi tiết những gì đã làm
   - **Reviewer:** Chọn nhóm trưởng
5. Nhấn **"Create pull request"**

### 6.4. Sau khi PR được merge

```bash
# Quay về nhánh develop
git checkout develop

# Cập nhật code mới nhất
git pull origin develop

# Xóa nhánh feature cũ (optional)
git branch -d feature/ten-chuc-nang-cu
```

---

## 📂 Cấu trúc Code - Bạn sẽ làm việc với những file nào?

### Nếu bạn làm phần **Controller**:
```
src/controllers/student/profile.controller.js
```

### Nếu bạn làm phần **View** (giao diện):
```
src/views/student/profile.hbs
public/css/student.css
public/js/student.js
```

### Nếu bạn làm phần **Model** (database):
```
src/models/user.model.js
```

### Nếu bạn làm phần **Route**:
```
src/routes/student.routes.js
```

---

## 🐛 Xử lý lỗi thường gặp

### Lỗi: "Cannot find module"
```bash
npm install
```

### Lỗi: "Port 3000 already in use"
```bash
# Windows: Tìm và kill process
netstat -ano | findstr :3000
taskkill /PID [số_PID] /F

# Mac/Linux
lsof -ti:3000 | xargs kill
```

### Lỗi: "ECONNREFUSED" khi connect database
- Kiểm tra lại file `.env`
- Xem Supabase có hoạt động không
- Hỏi nhóm trưởng

### Lỗi Git conflict
```bash
# Cập nhật code mới nhất từ develop
git pull origin develop

# Nếu có conflict, mở file bị conflict và sửa thủ công
# Sau đó:
git add .
git commit -m "fix: resolve conflict"
git push
```

---

## ✅ Checklist trước khi Push Code

- [ ] Code chạy được không có lỗi
- [ ] Đã test trên localhost
- [ ] Đã commit với message rõ ràng
- [ ] Không có file thừa (node_modules, .env)
- [ ] Code có comment đầy đủ
- [ ] Đã format code đẹp

---
## 🔄 Quy trình làm việc

```
1. Pull code mới nhất từ develop
   ↓
2. Làm việc trên nhánh feature của mình
```
---

## 📞 Liên hệ

**Nhóm trưởng:** Huỳnh Gia Hân - Email: huynhgiahan680@gmail.com / Zalo: 0346732411

**Zalo nhóm:** https://zalo.me/g/fgxyue364

**Meeting online:** https://meet.google.com/tdh-yjbx-vea

---

## 📚 Tài liệu tham khảo

- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Handlebars Syntax](https://handlebarsjs.com/guide/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

