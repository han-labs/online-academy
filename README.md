# Online Academy — PTUDW Final Project

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791.svg)](https://supabase.com/)

A full-stack web application for online learning (Udemy-style). Students can browse and enroll in courses, instructors can create and manage content, and admins oversee catalog and users.

- **Course:** Web Programming  
- **Class Code:** 251WEPR330479E_01FIE  
- **Instructor:** ThS. Ngô Ngọc Đăng Khoa  
- **Team:** 11
---

## 👥 Team & Responsibilities

| Student ID | Name                         | Role / Responsibilities |
|------------|------------------------------|-------------------------|
| 23110019   | Huỳnh Gia Hân                | Team Lead — project scaffolding & repository setup; database design & migrations; authentication/session flow; code reviews & merges; UI polish and consistency; bug fixing and conflict resolution. |
| 23110004   | Võ Nguyễn Ngọc Bích          | Guest Branch Owner — landing/home experience for guests; public search & browsing flows; prepared seed data and curated images/videos for public pages; supported data insertion scripts. |
| 23110051   | Trần Thị Tố Như              | Student Branch Owner — enrollment/learning UX for students (watchlist, checkout handoff, learning page); profile & “My Courses”; contributed seed data and media assets. |
| 23110028   | Trần Tuấn Kha                | Teacher Branch Owner — instructor workflows (course editor, chapters/lectures, uploads); instructor dashboard & profile; contributed seed data and course media. |
| 23110065   | Mai Trần Thùy Trang          | Admin Branch Owner — admin dashboard, category/user/course moderation; system settings; prepared admin fixtures and data-loading scripts.|

> All members contributed to planning, code reviews, and documentation.


---

## ✨ Key Features

### 👀 Guest
- Browse courses by category (with pagination)
- Full-text search with fuzzy matching
- Course detail pages with previewable lessons
- Engaging homepage: slideshow + featured carousels

### 👨‍🎓 Student
- Account registration with OTP email verification
- Purchase/enroll in courses
- Watch lectures with an integrated media player (Plyr)
- Manage Favorites/Watchlist
- Rate and review courses

### 👨‍🏫 Instructor
- Create courses with WYSIWYG editor (TinyMCE/CKEditor)
- Upload and manage lecture videos
- Organize chapters/lectures; track course status
- View basic course statistics

### 🧑‍💼 Admin
- Manage categories
- Moderate/remove courses that violate policies
- Manage students and instructors
- Dashboard overview

---

## 🛠 Tech Stack

**Backend:** Node.js (≥18), Express 4.18, Express Session  
**View Engine:** Handlebars  
**Database:** PostgreSQL (Supabase), Full-Text Search (FTS)  
**Frontend:** HTML5, CSS3, JavaScript, Bootstrap 5, Plyr (video), TinyMCE/CKEditor  
**Auth & Security:** bcrypt (password hashing), JWT, OTP Email verification

---

## 📦 Setup

### 1) Clone
```bash
git clone https://github.com/han-labs/online-academy.git
cd online-academy
```

### 2) Install deps
```bash
npm install
```

### 3) Run
```bash
# Development (nodemon recommended)
npm run dev

# Production
npm start
```

Visit: `http://localhost:3000`

---

## 🧪 Testing / Demo Accounts

**Admin**
- Email: `trangthuymai302@gmail.com`  
- Password: `123456`

**Instructor**
- Email: `trantuankha030205@gmail.com`  
- Password: `123456`

**Student**
- Email: `trantonhu1711@gmail.com`  
- Password: `123456`

> Replace with your actual demo accounts if they differ.

---

## 🌿 Git Workflow

**Branches**
```
main/master    → Production-ready
develop        → Integration branch
feature/*      → Per feature/task
```

---

## 📚 Notes & Capabilities

- Full-text search leverages PostgreSQL FTS with fallback to ILIKE for robust matching.
- Instructor dashboard supports status transitions (draft → completed → published) based on chapter/lecture completeness.
- Reviews and ratings include average computation and count; course cards summarize key stats.
- OTP email verification for account activation (configurable SMTP).

---

## 📝 License

MIT License — Online Academy Project  
© 2025 Online Academy Team

---

## 🙏 References

- [Udemy](https://www.udemy.com) — UI/UX inspiration  
- [Express.js](https://expressjs.com/) — Documentation  
- [Supabase](https://supabase.com/docs) — Documentation  
- [Plyr](https://plyr.io/) — Video Player Docs
