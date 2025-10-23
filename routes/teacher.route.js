import express from 'express';
import db from '../utils/db.js';               // ✅ giữ nguyên import db
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();              // ✅ Khai báo router

// 🛡️ Middleware kiểm tra quyền đăng nhập và role giảng viên
router.use(requireAuth);
router.use((req, res, next) => {
  if (req.session.user?.role !== 'instructor') {
    return res.redirect('/');
  }
  next();
});

// 📌 Dashboard giảng viên
router.get('/dashboard', async (req, res) => {
  try {
    const instructorId = req.session.user.id;

    // ✅ Knex: COUNT(*)
    const [{ total_courses }] = await db('courses')
      .count('* as total_courses')
      .where({ instructor_id: instructorId });

    res.render('vwTeacher/dashboard', {
      layout: 'main',
      total_courses,
    });
  } catch (err) {
    console.error('❌ Lỗi khi tải dashboard:', err);
    res.status(500).render('vwTeacher/error', { layout: 'main', message: 'Lỗi khi tải dashboard' });
  }
});

// 📌 Danh sách khóa học
router.get('/courses', async (req, res) => {
  try {
    const instructorId = req.session.user.id;

    const courses = await db('courses')
      .select('id', 'title', 'price', 'promotional_price', 'status', 'last_updated')
      .where({ instructor_id: instructorId })
      .orderBy('last_updated', 'desc');

    res.render('vwTeacher/courses', {
      layout: 'main',
      courses,
    });
  } catch (err) {
    console.error('❌ Lỗi khi tải khóa học:', err);
    res.status(500).render('vwTeacher/error', { layout: 'main', message: 'Lỗi khi tải khóa học' });
  }
});

// 📌 Form thêm khóa học
router.get('/courses/add', async (req, res) => {
  try {
    // ✅ Lấy danh mục từ DB
    const categories = await db('categories').select('id', 'name');

    res.render('vwTeacher/addCourse', {
      layout: 'main',
      categories, // truyền xuống view
    });
  } catch (err) {
    console.error('❌ Lỗi khi tải form thêm khóa học:', err);
    res.status(500).render('vwTeacher/error', { layout: 'main', message: 'Lỗi khi tải form thêm khóa học' });
  }
});

// 🟢 Xử lý thêm khóa học
router.post('/courses/add', async (req, res) => {
  const { title, short_description, detailed_description, price, promotional_price, category_id, image_url } = req.body;
  const instructorId = req.session.user.id;

  try {
    await db('courses').insert({
      title,
      short_description,
      detailed_description,
      price,
      promotional_price,
      category_id,
      image_url,
      instructor_id: instructorId,
      status: 'published',
      last_updated: db.fn.now(),
    });

    res.redirect('/teacher/courses');
  } catch (err) {
    console.error('❌ Lỗi khi thêm khóa học:', err);
    res.status(500).render('vwTeacher/error', { layout: 'main', message: 'Lỗi khi thêm khóa học' });
  }
});

// ✏️ Form chỉnh sửa khóa học
router.get('/courses/:id/edit', async (req, res) => {
  const { id } = req.params;
  const instructorId = req.session.user.id;

  try {
    const course = await db('courses')
      .where({ id, instructor_id: instructorId })
      .first();

    if (!course) {
      return res.status(404).render('vwTeacher/error', { layout: 'main', message: 'Không tìm thấy khóa học' });
    }

    // ✅ Lấy danh mục để chọn khi edit
    const categories = await db('categories').select('id', 'name');

    res.render('vwTeacher/editCourse', {
      layout: 'main',
      course,
      categories, // truyền xuống view
    });
  } catch (err) {
    console.error('❌ Lỗi khi tải khóa học để chỉnh sửa:', err);
    res.status(500).render('vwTeacher/error', { layout: 'main', message: 'Lỗi khi tải khóa học để chỉnh sửa' });
  }
});

// 🟡 Cập nhật khóa học
router.post('/courses/:id/edit', async (req, res) => {
  const { id } = req.params;
  const { title, short_description, detailed_description, price, promotional_price, image_url, status, category_id } = req.body;
  const instructorId = req.session.user.id;

  try {
    await db('courses')
      .where({ id, instructor_id: instructorId })
      .update({
        title,
        short_description,
        detailed_description,
        price,
        promotional_price,
        image_url,
        status,
        category_id, // ✅ cập nhật category nếu đổi
        last_updated: db.fn.now(),
      });

    res.redirect('/teacher/courses');
  } catch (err) {
    console.error('❌ Lỗi khi cập nhật khóa học:', err);
    res.status(500).render('vwTeacher/error', { layout: 'main', message: 'Lỗi khi cập nhật khóa học' });
  }
});

// 🗑️ Xóa khóa học
router.post('/courses/:id/delete', async (req, res) => {
  const { id } = req.params;
  const instructorId = req.session.user.id;

  try {
    await db('courses')
      .where({ id, instructor_id: instructorId })
      .del();

    res.redirect('/teacher/courses');
  } catch (err) {
    console.error('❌ Lỗi khi xóa khóa học:', err);
    res.status(500).render('vwTeacher/error', { layout: 'main', message: 'Lỗi khi xóa khóa học' });
  }
});

export default router;
