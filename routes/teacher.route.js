// routes/teacher.route.js  
import db from '../utils/db.js';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireInstructor } from '../middlewares/auth.js';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';

const router = Router();

// ==== Multer: image + video (500MB) ====
const storage = multer.diskStorage({
  destination(req, file, cb) {
    let dir;
    if (file.mimetype.startsWith('image')) {
      dir = file.fieldname === 'profile_picture'
        ? './public/uploads/avatars'
        : './public/uploads/courses';
    } else if (file.mimetype.startsWith('video')) {
      dir = './public/uploads/lectures';
    } else {
      dir = './public/uploads/courses';
    }
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter(req, file, cb) {
    const ok = file.mimetype.startsWith('image') || file.mimetype.startsWith('video');
    cb(ok ? null : new Error('Unsupported file type'), ok);
  }
});

// ---------------- Dashboard ----------------
router.get('/dashboard', requireAuth, requireInstructor, async (req, res) => {
  const userId = req.session.user.id;

  const courses = await db('courses')
    .leftJoin('categories', 'courses.category_id', 'categories.id')
    .where('courses.instructor_id', userId)
    .select('courses.*', 'categories.name as category_name')
    .orderBy('courses.last_updated', 'desc');

  for (const course of courses) {
    const { count } = await db('enrollments').where('course_id', course.id).count('user_id as count').first();
    course.total_students = parseInt(count) || 0;
  }

  res.render('vwTeacher/dashboard', { user: req.session.user, courses });
});

router.post('/course/:id/toggle-status', requireAuth, requireInstructor, async (req, res) => {
  const courseId = Number(req.params.id);
  const { status } = req.body;
  const allowed = ['draft', 'completed', 'published'];
  if (!allowed.includes(status)) return res.status(400).send('Trạng thái không hợp lệ.');

  const course = await courseModel.detail(courseId);
  if (!course || course.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền chỉnh sửa khóa học này.');

  await db('courses').where('id', courseId).update({ status });
  res.redirect('/teacher/dashboard');
});

// ---------------- Add Course ----------------
router.get('/course/add', requireAuth, requireInstructor, async (req, res) => {
  const categoriesTree = await categoryModel.findTree();
  res.render('vwTeacher/addCourse', { categoriesTree });
});

router.post('/course/add', requireAuth, requireInstructor, upload.single('image'), async (req, res) => {
  const userId = req.session.user.id;
  const { title, short_description, detailed_description, price, promotional_price, category_id } = req.body;
  const image = req.file ? `/uploads/courses/${req.file.filename}` : null;

  await courseModel.add({
    title,
    short_description,
    detailed_description,
    price: parseFloat(price) || 0,
    promotional_price: promotional_price ? parseFloat(promotional_price) : null,
    category_id: category_id || null,
    image_url: image,
    instructor_id: userId,
    status: 'draft',
    last_updated: db.fn.now()
  });

  res.redirect('/teacher/dashboard');
});

// ---------------- View Course Detail ----------------
router.get('/course/:id/detail', requireAuth, requireInstructor, async (req, res) => {
  const id = Number(req.params.id);

  const course = await db('courses')
    .join('users', 'courses.instructor_id', 'users.id')
    .leftJoin('categories', 'courses.category_id', 'categories.id')
    .select(
      'courses.*',
      'users.full_name as instructor_name',
      'users.profile_picture_url as instructor_avatar',
      'users.email',
      'users.instructor_bio',
      'categories.name as category_name'
    )
    .where('courses.id', id)
    .first();

  if (!course || course.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền xem khóa học này.');

  const curriculum = await courseModel.curriculum(id);
  const lecturesGrouped = {};
  curriculum.lectures.forEach(l => {
    if (!lecturesGrouped[l.chapter_id]) lecturesGrouped[l.chapter_id] = [];
    lecturesGrouped[l.chapter_id].push(l);
  });

  const totalStudentsResult = await db('enrollments').where({ course_id: id }).count('user_id as count').first();
  const total_students = parseInt(totalStudentsResult.count) || 0;

  const ratingStats = await db('reviews')
    .where({ course_id: id })
    .select(db.raw('AVG(rating)::numeric(10,2) as average_rating, COUNT(*) as rating_count'))
    .first();

  const average_rating = ratingStats?.average_rating || null;
  const rating_count = parseInt(ratingStats?.rating_count) || 0;

  const comments = await db('reviews')
    .join('users', 'reviews.user_id', 'users.id')
    .where('reviews.course_id', id)
    .select('reviews.comment', 'reviews.rating', 'reviews.created_at', 'users.full_name', 'users.profile_picture_url')
    .orderBy('reviews.created_at', 'desc');

  const watchlist_count = await db('watchlists').where({ course_id: id }).count('user_id as count').first();

  res.render('vwTeacher/courseDetail', {
    course,
    chapters: curriculum.chapters,
    lectures: lecturesGrouped,
    total_students,
    average_rating,
    rating_count,
    comments,
    watchlist_count: parseInt(watchlist_count.count) || 0
  });
});

// ---------------- Edit Course ----------------
router.get('/course/:id/edit', requireAuth, requireInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const course = await courseModel.detail(id);
  if (!course || course.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền chỉnh sửa khóa học này.');

  const categoriesTree = await categoryModel.findTree();

  const chapters = await db('chapters')
    .where('course_id', id)
    .orderBy('chapter_order', 'asc');

  const lecturesRaw = await db('lectures')
    .join('chapters', 'lectures.chapter_id', 'chapters.id')
    .where('chapters.course_id', id)
    .orderBy('chapters.chapter_order', 'asc')
    .orderBy('lectures.lecture_order', 'asc')
    .select('lectures.*', 'lectures.chapter_id');

  const lectures = {};
  lecturesRaw.forEach(l => {
    if (!lectures[l.chapter_id]) lectures[l.chapter_id] = [];
    lectures[l.chapter_id].push(l);
  });

  course.category_id = Number(course.category_id);

  res.render('vwTeacher/editCourse', {
    course,
    categoriesTree,
    selectedCategoryId: course.category_id,
    chapters,
    lectures
  });
});

router.post('/course/:id/edit', requireAuth, requireInstructor, upload.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  const course = await courseModel.detail(id);
  if (!course || course.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền chỉnh sửa khóa học này.');

  const { title, short_description, detailed_description, price, promotional_price, category_id, status } = req.body;
  const image = req.file ? `/uploads/courses/${req.file.filename}` : course.image_url;

  await courseModel.update(id, {
    title,
    short_description,
    detailed_description,
    price: parseFloat(price) || 0,
    promotional_price: promotional_price ? parseFloat(promotional_price) : null,
    category_id: category_id ? Number(category_id) : null,
    image_url: image,
    status,
    last_updated: db.fn.now()
  });

  res.redirect('/teacher/course/' + id + '/edit');
});

// ---------------- Manage Chapters ----------------
router.post('/course/:id/chapter/add', requireAuth, requireInstructor, async (req, res) => {
  const courseId = Number(req.params.id);
  const course = await courseModel.detail(courseId);
  if (!course || course.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền thêm chương.');

  const { title } = req.body;
  const maxOrder = await db('chapters').where('course_id', courseId).max('chapter_order as max').first();
  const nextOrder = (maxOrder?.max || 0) + 1;

  await db('chapters').insert({ title, course_id: courseId, chapter_order: nextOrder });
  await courseModel.checkAndUpdateStatus(courseId);

  res.redirect('/teacher/course/' + courseId + '/edit');
});

router.post('/chapter/:id/edit', requireAuth, requireInstructor, async (req, res) => {
  const chapterId = Number(req.params.id);
  const { title } = req.body;
  const chapter = await db('chapters')
    .join('courses', 'chapters.course_id', 'courses.id')
    .where('chapters.id', chapterId)
    .select('courses.instructor_id', 'courses.id as course_id')
    .first();

  if (!chapter || chapter.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền sửa chương này.');

  await db('chapters').where('id', chapterId).update({ title });
  await db('courses').where('id', chapter.course_id).update({ last_updated: db.fn.now() });

  res.redirect('/teacher/course/' + chapter.course_id + '/edit');
});

router.post('/chapter/:id/delete', requireAuth, requireInstructor, async (req, res) => {
  const chapterId = Number(req.params.id);
  const chapter = await db('chapters')
    .join('courses', 'chapters.course_id', 'courses.id')
    .where('chapters.id', chapterId)
    .select('courses.instructor_id', 'courses.id as course_id')
    .first();

  if (!chapter || chapter.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền xóa chương này.');

  await db('lectures').where('chapter_id', chapterId).del();
  await db('chapters').where('id', chapterId).del();
  await courseModel.checkAndUpdateStatus(chapter.course_id);

  res.redirect('/teacher/course/' + chapter.course_id + '/edit');
});

// -------- Add Lecture (URL or FILE) --------
router.post('/chapter/:id/lecture/add', requireAuth, requireInstructor, upload.single('video_file'), async (req, res) => {
  const chapterId = Number(req.params.id);
  const { title, video_url, duration_minutes, is_preview_allowed } = req.body;

  const chapter = await db('chapters').where('id', chapterId).first();
  if (!chapter) return res.status(404).send('Chương không tồn tại');

  const course = await courseModel.detail(chapter.course_id);
  if (!course || course.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền thêm bài giảng');

  const maxOrder = await db('lectures').where('chapter_id', chapterId).max('lecture_order as max').first();
  const nextOrder = (maxOrder?.max || 0) + 1;

  let finalVideoUrl = video_url || null;
  if (req.file) finalVideoUrl = `/uploads/lectures/${req.file.filename}`;

  await db('lectures').insert({
    title,
    video_url: finalVideoUrl,
    duration_minutes: duration_minutes || null,
    is_preview_allowed: is_preview_allowed === 'on' ? 1 : 0,
    chapter_id: chapterId,
    lecture_order: nextOrder
  });

  await courseModel.checkAndUpdateStatus(course.id);
  res.redirect('/teacher/course/' + course.id + '/edit');
});

// -------- Edit Lecture (URL or FILE) --------
router.get('/lecture/:id/edit', requireAuth, requireInstructor, async (req, res) => {
  const lectureId = Number(req.params.id);
  const lecture = await db('lectures')
    .join('chapters', 'lectures.chapter_id', 'chapters.id')
    .join('courses', 'chapters.course_id', 'courses.id')
    .where('lectures.id', lectureId)
    .select('lectures.*', 'courses.instructor_id', 'courses.id as course_id', 'courses.title as course_title')
    .first();

  if (!lecture || lecture.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền sửa bài giảng này.');

  const chapters = await db('chapters').where('course_id', lecture.course_id).orderBy('chapter_order', 'asc');

  res.render('vwTeacher/editLecture', { lecture, chapters, courseId: lecture.course_id });
});

router.post('/lecture/:id/edit', requireAuth, requireInstructor, upload.single('video_file'), async (req, res) => {
  const lectureId = Number(req.params.id);
  const { title, video_url, duration_minutes, is_preview_allowed, chapter_id } = req.body;

  const lecture = await db('lectures')
    .join('chapters', 'lectures.chapter_id', 'chapters.id')
    .join('courses', 'chapters.course_id', 'courses.id')
    .where('lectures.id', lectureId)
    .select('courses.instructor_id', 'courses.id as course_id', 'lectures.video_url', 'lectures.chapter_id')
    .first();

  if (!lecture || lecture.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền sửa bài giảng này.');

  if (chapter_id) {
    const chapterId = Number(chapter_id);
    const chapter = await db('chapters').where({ id: chapterId, course_id: lecture.course_id }).first();
    if (!chapter) return res.status(400).send('Chương không hợp lệ.');
  }

  let finalVideoUrl = lecture.video_url;
  if (req.file) finalVideoUrl = `/uploads/lectures/${req.file.filename}`;
  else if (video_url) finalVideoUrl = video_url;

  await db('lectures').where('id', lectureId).update({
    title,
    video_url: finalVideoUrl,
    duration_minutes: duration_minutes || null,
    is_preview_allowed: is_preview_allowed === 'on' ? 1 : 0,
    chapter_id: chapter_id ? Number(chapter_id) : lecture.chapter_id
  });

  await db('courses').where('id', lecture.course_id).update({ last_updated: db.fn.now() });
  res.redirect('/teacher/course/' + lecture.course_id + '/edit');
});

router.post('/lecture/:id/delete', requireAuth, requireInstructor, async (req, res) => {
  const lectureId = Number(req.params.id);
  const lecture = await db('lectures')
    .join('chapters', 'lectures.chapter_id', 'chapters.id')
    .join('courses', 'chapters.course_id', 'courses.id')
    .where('lectures.id', lectureId)
    .select('courses.instructor_id', 'courses.id as course_id')
    .first();

  if (!lecture || lecture.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền xóa bài giảng này.');

  await db('lectures').where('id', lectureId).del();
  await courseModel.checkAndUpdateStatus(lecture.course_id);

  res.redirect('/teacher/course/' + lecture.course_id + '/edit');
});

router.post('/lecture/:id/toggle-preview', requireAuth, requireInstructor, async (req, res) => {
  const lectureId = Number(req.params.id);
  const lecture = await db('lectures')
    .join('chapters', 'lectures.chapter_id', 'chapters.id')
    .join('courses', 'chapters.course_id', 'courses.id')
    .where('lectures.id', lectureId)
    .select('courses.instructor_id', 'courses.id as course_id', 'lectures.is_preview_allowed')
    .first();

  if (!lecture || lecture.instructor_id !== req.session.user.id)
    return res.status(403).json({ error: 'Không có quyền' });

  const newValue = lecture.is_preview_allowed === 1 ? 0 : 1;
  await db('lectures').where('id', lectureId).update({ is_preview_allowed: newValue });
  res.json({ success: true, is_preview_allowed: newValue });
});

// ---------------- Delete Course ----------------
router.post('/course/:id/delete', requireAuth, requireInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const course = await courseModel.detail(id);
  if (!course || course.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền xóa khóa học này.');

  const chapters = await db('chapters').where('course_id', id);
  for (const chapter of chapters) {
    await db('lectures').where('chapter_id', chapter.id).del();
  }
  await db('chapters').where('course_id', id).del();
  await db('courses').where('id', id).del();

  res.redirect('/teacher/dashboard');
});

// ---------------- Delete Course (from Profile) ----------------
router.post('/profile/course/:id/delete', requireAuth, requireInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const course = await courseModel.detail(id);
  if (!course || course.instructor_id !== req.session.user.id)
    return res.status(403).send('Không có quyền xóa khóa học này.');

  const chapters = await db('chapters').where('course_id', id);
  for (const chapter of chapters) {
    await db('lectures').where('chapter_id', chapter.id).del();
  }
  await db('chapters').where('course_id', id).del();
  await db('courses').where('id', id).del();

  res.redirect('/teacher/profile');
});

// ---------------- Profile ----------------
router.get('/profile', requireAuth, requireInstructor, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await db('users').where({ id: userId }).first();

    const courses = await db('courses')
      .leftJoin('categories', 'courses.category_id', 'categories.id')
      .where('courses.instructor_id', userId)
      .select('courses.*', 'categories.name as category_name')
      .orderBy('courses.last_updated', 'desc');

    for (const course of courses) {
      const { count } = await db('enrollments').where('course_id', course.id).count('user_id as count').first();
      course.total_students = parseInt(count) || 0;
    }

    res.render('vwTeacher/profile', { user, courses });
  } catch (err) {
    console.error('Error loading teacher profile:', err);
    res.status(500).send('Lỗi khi tải hồ sơ giảng viên');
  }
});

router.post('/profile', requireAuth, requireInstructor, upload.single('profile_picture'), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { full_name, email, bio } = req.body;

    const profilePicture = req.file
      ? `/uploads/avatars/${req.file.filename}`
      : req.session.user.profile_picture_url;

    await db('users').where({ id: userId }).update({
      full_name, email, instructor_bio: bio, profile_picture_url: profilePicture
    });

    req.session.user = {
      ...req.session.user,
      full_name,
      email,
      instructor_bio: bio,
      profile_picture_url: profilePicture
    };

    req.session.save(() => res.redirect('/teacher/profile'));
  } catch (err) {
    console.error('Error updating teacher profile:', err);
    res.status(500).send('Lỗi khi cập nhật hồ sơ giảng viên');
  }
});

// ---------------- APIs ----------------
router.get('/api/user/profile', requireAuth, requireInstructor, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await db('users').where({ id: userId }).first();
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });

    res.json({
      id: user.id,
      name: user.full_name || user.name,
      email: user.email,
      profile_picture_url: user.profile_picture_url || '/static/images/default-avatar.png',
    });
  } catch (err) {
    console.error('Lỗi khi lấy thông tin user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/api/courses/:id', requireAuth, requireInstructor, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const course = await db('courses').where({ id }).first();
    if (!course) return res.status(404).json({ error: 'Không tìm thấy khóa học' });
    if (course.instructor_id !== req.session.user.id)
      return res.status(403).json({ error: 'Không có quyền truy cập khóa học này' });
    res.json(course);
  } catch (err) {
    console.error('Lỗi khi lấy thông tin khóa học:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
