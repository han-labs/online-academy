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

import studentRouter from './routes/student.route.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 👉 Khởi tạo app TRƯỚC, rồi mới app.use(...)
const app = express();


// view engine
app.engine('handlebars', engine({
  helpers: {
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

    // 👉 Thêm ifCond
    ifCond: function (v1, operator, v2, options) {
      // Nếu options không tồn tại, trả về false
      if (!options || !options.fn || !options.inverse) return '';

      let result;
      switch (operator) {
        case '==': result = (v1 == v2); break;
        case '===': result = (v1 === v2); break;
        case '!=': result = (v1 != v2); break;
        case '!==': result = (v1 !== v2); break;
        case '<': result = (v1 < v2); break;
        case '<=': result = (v1 <= v2); break;
        case '>': result = (v1 > v2); break;
        case '>=': result = (v1 >= v2); break;
        case '&&': result = (v1 && v2); break;
        case '||': result = (v1 || v2); break;
        default: result = false;
      }
      return result ? options.fn(this) : options.inverse(this);
    }

  },
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials')
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// middleware
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static'))); // ✅ không dùng ../static

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
app.use('/student', studentRouter);
// 404
app.use((req, res) => res.status(404).render('vwAccount/404'));

const PORT = 3000;
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));
export default app;
