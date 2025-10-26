// app.js (root)
import express from 'express';
import { engine } from 'express-handlebars';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

import categoryModel from './models/category.model.js';
import homeRouter from './routes/home.route.js';
import categoryRouter from './routes/category.route.js';
import accountRouter from './routes/account.route.js';
import courseRouter from './routes/course.route.js';
import adminCategoryRouter from './routes/admin.category.route.js';
import { requireAuth, checkAdmin } from './middlewares/auth.js';
//Them cac route cho chuc nang cua student
import studentRouter from './routes/student.route.js'; // 
import checkoutRouter from './routes/checkout.route.js';
import progressRouter from './routes/progress.route.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 👉 Khởi tạo app TRƯỚC, rồi mới app.use(...)
const app = express();

// view engine
app.engine('handlebars', engine({
  helpers: {
     // THÊM HELPER STARS Ở ĐÂY
    stars: function(rating) {
      let stars = '';
      for (let i = 1; i <= 5; i++) {
        stars += i <= rating ? '★' : '☆';
      }
      return stars;
    }, 
    formatDate: function(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
        });
    },

    formatNumber(v) { return new Intl.NumberFormat('en-US').format(v ?? 0); },
    eq(a, b) { return a === b; },
    add: (a, b) => (a || 0) + (b || 0),
    sub: (a, b) => (a || 0) - (b || 0),
    length: (arr) => Array.isArray(arr) ? arr.length : 0,
    price(p, promo) { return promo && promo > 0 ? promo : p; },
    ifPromo(p, promo, opts) { return promo && promo > 0 ? opts.fn(this) : opts.inverse(this); },
    fillContent: function (value, defaultValue) {
      return value != null && value !== '' ? value : defaultValue || '';
    },
    range(start, end) {
      const s = Number(start) || 0, e = Number(end) || 0, out = [];
      for (let i = s; i <= e; i++) out.push(i);
      return out;
    },
    substring(str, start, end) {
      return (str || '').substring(start, end);
    },
   // Trong app.js, sửa helper contains
  contains: function(array, value) {
    console.log('🎯 HELPER CONTAINS CALLED - array:', array, 'value:', value, 'type of array:', typeof array);
    if (!array || !Array.isArray(array)) {
        console.log('❌ Array is invalid or not an array');
        return false;
    }
    const result = array.includes(value);
    console.log('✅ Contains result:', result);
    return result;
},
  calculateChapterDuration: function(lectures) {
    if (!Array.isArray(lectures)) return 0;
    return lectures.reduce((total, lecture) => total + (lecture.duration_minutes || 0), 0);
}

  },
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials')
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// middleware
//  THÊM MIDDLEWARE NÀY - QUAN TRỌNG!
app.use(express.json()); // ← THÊM DÒNG NÀY để parse JSON body
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static'))); //  không dùng ../static

app.use(session({
  secret: 'exam-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// inject user + categories
app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  try {
    res.locals.global_categories = await categoryModel.findAll();
    res.locals.global_categories_tree = await categoryModel.findTree();
  } catch { res.locals.global_categories = []; res.locals.global_categories_tree = []; }
  next();
});


// routes
app.use('/', homeRouter);
app.use('/account', accountRouter);
app.use('/categories', categoryRouter);
app.use('/courses', courseRouter);
app.use('/admin/categories', requireAuth, checkAdmin, adminCategoryRouter); // 👉 đặt SAU khi có app
app.use('/student', requireAuth, studentRouter); 
app.use('/checkout', requireAuth, checkoutRouter);
app.use('/api/progress', progressRouter);
// 404
app.use((req, res) => res.status(404).render('vwAccount/404'));

const PORT = 3000;
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));
export default app;
