// app.js (root)
import express from "express";
import { engine } from "express-handlebars";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

import categoryModel from "./models/category.model.js";
import homeRouter from "./routes/home.route.js";
import categoryRouter from "./routes/category.route.js";
import accountRouter from "./routes/account.route.js";
import courseRouter from "./routes/course.route.js";
import { requireAuth, checkAdmin } from "./middlewares/auth.js";
import adminRouter from "./routes/admin.route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 👉 Khởi tạo app TRƯỚC, rồi mới app.use(...)
const app = express();

// view engine
app.engine(
  "handlebars",
  engine({
    helpers: {
      // Định dạng số
      formatNumber(v) {
        return new Intl.NumberFormat("en-US").format(v ?? 0);
      },

      // So sánh bằng / không bằng
      eq(a, b) {
        return a === b;
      },
      neq(a, b) {
        return a !== b;
      },

      // Phép cộng / trừ cơ bản
      add: (a, b) => (a || 0) + (b || 0),
      sub: (a, b) => (a || 0) - (b || 0),

      // Độ dài mảng
      length: (arr) => (Array.isArray(arr) ? arr.length : 0),

      // Hiển thị giá có giảm giá
      price(p, promo) {
        return promo && promo > 0 ? promo : p;
      },
      ifPromo(p, promo, opts) {
        return promo && promo > 0 ? opts.fn(this) : opts.inverse(this);
      },

      // Giá trị mặc định nếu trống
      fillContent(value, defaultValue) {
        return value != null && value !== "" ? value : defaultValue || "";
      },

      // Tạo mảng range
      range(start, end) {
        const s = Number(start) || 0,
          e = Number(end) || 0,
          out = [];
        for (let i = s; i <= e; i++) out.push(i);
        return out;
      },

      // Định dạng tiền VND
      formatCurrency(amount) {
        return new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(amount || 0);
      },

      // Badge cho trạng thái
      getStatusBadge(status) {
        const map = {
          draft: "secondary",
          published: "success",
          completed: "primary",
        };
        return map[status] || "secondary";
      },

      // Text hiển thị trạng thái
      getStatusText(status) {
        const map = {
          draft: "Draft",
          published: "Published",
          completed: "Completed",
        };
        return map[status] || status;
      },

      // Định dạng ngày
      formatDate(date) {
        return new Date(date || new Date()).toLocaleDateString("vi-VN");
      },

      // Đánh giá sao ★
      stars(rating) {
        if (!rating) return "";
        return [...Array(5)].map((_, i) => (i < rating ? "★" : "☆")).join("");
      },

      // So sánh > và <
      gt(a, b) {
        return a > b;
      },
      lt(a, b) {
        return a < b;
      },

      // Kiểm tra giá trị không rỗng
      notEmpty(value) {
        return value && value.toString().trim() !== "";
      },

      // Lặp với index
      eachWithIndex(context, options) {
        let out = "";
        for (let i = 0; i < context.length; i++) {
          out += options.fn(context[i], { data: { index: i } });
        }
        return out;
      },

      // Toán tử logic
      and(a, b) {
        return a && b;
      },
      or(a, b) {
        return a || b;
      },

      // Vai trò user
      getRoleBadge(role) {
        const map = {
          admin: "danger",
          instructor: "success",
          student: "primary",
        };
        return map[role] || "secondary";
      },
      getRoleText(role) {
        const map = {
          admin: "Administrator",
          instructor: "Instructor",
          student: "Student",
        };
        return map[role] || role;
      },

      // Tính tổng học viên
      getTotalStudents(courses) {
        if (!Array.isArray(courses)) return 0;
        return courses.reduce(
          (total, c) => total + (c.enrollment_count || 0),
          0
        );
      },
    },

    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views/layouts"),
    partialsDir: path.join(__dirname, "views/partials"),
  })
);

app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// middleware
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(path.join(__dirname, "static"))); // ✅ không dùng ../static
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use(
  session({
    secret: "exam-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
  })
);

// inject user + categories
app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  try {
    res.locals.global_categories = await categoryModel.findAll();
    res.locals.global_categories_tree = await categoryModel.findTree();
  } catch {
    res.locals.global_categories = [];
    res.locals.global_categories_tree = [];
  }
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

// routes
app.use("/", homeRouter);
app.use("/account", accountRouter);
app.use("/categories", categoryRouter);
app.use("/courses", courseRouter);

app.use("/admin", requireAuth, checkAdmin, adminRouter);

// 404
app.use((req, res) => res.status(404).render("vwAccount/404"));

const PORT = 3000;
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));
export default app;
