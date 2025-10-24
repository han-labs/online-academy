import db from '../utils/db.js';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireInstructor } from '../middlewares/auth.js';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';

const router = Router();

// Multer setup for video/image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dir;
        if (file.mimetype.startsWith('video')) {
            dir = './public/uploads/lectures';
        } else if (file.mimetype.startsWith('image')) {
            if (file.fieldname === 'profile_picture') {
                dir = './public/uploads/avatars';
            } else {
                dir = './public/uploads/courses';
            }
        } else {
            dir = './public/uploads/courses';
        }
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ---------------- Dashboard ----------------
router.get('/dashboard', requireAuth, requireInstructor, async (req, res) => {
    const userId = req.session.user.id;
    const courses = await courseModel.findByInstructor(userId);
    res.render('vwTeacher/dashboard', { user: req.session.user, courses });
});

router.post('/course/:id/toggle-status', requireAuth, requireInstructor, async (req, res) => {
    const courseId = Number(req.params.id);
    const { status } = req.body;

    // Kiểm tra giá trị hợp lệ
    const allowedStatuses = ['draft', 'completed', 'published'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).send('Trạng thái không hợp lệ.');
    }

    // Lấy khóa học
    const course = await courseModel.detail(courseId);
    if (!course || course.instructor_id !== req.session.user.id)
        return res.status(403).send('Không có quyền chỉnh sửa khóa học này.');

    // Cập nhật status
    await db('courses')
        .where('id', courseId)
        .update({ status });

    res.redirect('/teacher/dashboard');
});

// ---------------- Add Course ----------------
router.get('/course/add', requireAuth, requireInstructor, async (req, res) => {
    // Lấy categories con (có parent_id khác null)
    const categories = await db('categories')
        .whereNotNull('parent_id')
        .select('*');

    res.render('vwTeacher/addCourse', { categories });
});

router.post('/course/add', requireAuth, requireInstructor, upload.single('image'), async (req, res) => {
    const userId = req.session.user.id;
    const { title, short_description, detailed_description, price, promotional_price, category_id } = req.body;
    const image = req.file ? `/uploads/courses/${req.file.filename}` : null;

    const newCourse = await courseModel.add({
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

    // Lấy thông tin khóa học
    const course = await courseModel.detail(id);

    if (!course || course.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền xem khóa học này.');
    }

    // Lấy curriculum (chapters + lectures)
    const curriculum = await courseModel.curriculum(id);

    // Nếu curriculum.lectures chưa group theo chapter, group ở đây
    const lecturesGrouped = {};
    curriculum.lectures.forEach(lecture => {
        if (!lecturesGrouped[lecture.chapter_id]) lecturesGrouped[lecture.chapter_id] = [];
        lecturesGrouped[lecture.chapter_id].push(lecture);
    });

    res.render('vwTeacher/courseDetail', { 
        course, 
        chapters: curriculum.chapters, 
        lectures: lecturesGrouped
    });
});

// ---------------- Edit Course ----------------
router.get('/course/:id/edit', requireAuth, requireInstructor, async (req, res) => {
    const id = Number(req.params.id);
    const course = await courseModel.detail(id);
    if (!course || course.instructor_id !== req.session.user.id)
        return res.status(403).send('Không có quyền chỉnh sửa khóa học này.');

    const categories = await db('categories')
        .whereNotNull('parent_id')
        .select('*');

    // Lấy chapters
    const chapters = await db('chapters')
        .where('course_id', id)
        .orderBy('chapter_order', 'asc')
        .select('*');

    // Lấy tất cả lectures của course
    const lecturesRaw = await db('lectures')
        .join('chapters', 'lectures.chapter_id', 'chapters.id')
        .where('chapters.course_id', id)
        .orderBy('chapters.chapter_order', 'asc')
        .orderBy('lectures.lecture_order', 'asc')
        .select('lectures.*', 'lectures.chapter_id');

    // Group lecture theo chapter id
    const lecturesGrouped = {};
    lecturesRaw.forEach(l => {
        if (!lecturesGrouped[l.chapter_id]) lecturesGrouped[l.chapter_id] = [];
        lecturesGrouped[l.chapter_id].push(l);
    });

    res.render('vwTeacher/editCourse', { 
        course, 
        categories, 
        chapters, 
        lectures: lecturesGrouped
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
        category_id: category_id || null,
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
    
    if (!course || course.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền thêm chương.');
    }

    const { title } = req.body;
    const maxOrder = await db('chapters').where('course_id', courseId).max('chapter_order as max').first();
    const nextOrder = (maxOrder?.max || 0) + 1;

    await db('chapters').insert({ title, course_id: courseId, chapter_order: nextOrder });
    
    // Kiểm tra và cập nhật status
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
    
    if (!chapter || chapter.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền sửa chương này.');
    }

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
    
    if (!chapter || chapter.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền xóa chương này.');
    }

    await db('lectures').where('chapter_id', chapterId).del();
    await db('chapters').where('id', chapterId).del();
    await courseModel.checkAndUpdateStatus(chapter.course_id);
    
    res.redirect('/teacher/course/' + chapter.course_id + '/edit');
});

// ---------------- Add Lecture từ Chapter Modal ----------------
router.post('/chapter/:id/lecture/add', requireAuth, requireInstructor, upload.single('video'), async (req, res) => {
    const chapterId = Number(req.params.id);
    const { title, duration_minutes, is_preview_allowed } = req.body;

    // Lấy chapter và kiểm tra quyền
    const chapter = await db('chapters').where('id', chapterId).first();
    if (!chapter) return res.status(404).send('Chương không tồn tại');

    const course = await courseModel.detail(chapter.course_id);
    if (!course || course.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền thêm bài giảng');
    }

    // Xác định lecture_order tiếp theo
    const maxOrder = await db('lectures').where('chapter_id', chapterId).max('lecture_order as max').first();
    const nextOrder = (maxOrder?.max || 0) + 1;

    // Upload video nếu có
    const videoUrl = req.file ? `/uploads/lectures/${req.file.filename}` : null;

    // Thêm lecture
    await db('lectures').insert({
        title,
        video_url: videoUrl,
        duration_minutes: duration_minutes || null,
        is_preview_allowed: is_preview_allowed === 'on' ? 1 : 0,
        chapter_id: chapterId,
        lecture_order: nextOrder
    });

    // Cập nhật trạng thái course
    await courseModel.checkAndUpdateStatus(course.id);

    // Redirect về trang edit course
    res.redirect('/teacher/course/' + course.id + '/edit');
});




// ✨ THÊM ROUTE MỚI: Hiển thị form edit bài giảng với dropdown chọn chapter
router.get('/lecture/:id/edit', requireAuth, requireInstructor, async (req, res) => {
    const lectureId = Number(req.params.id);
    const lecture = await db('lectures')
        .join('chapters', 'lectures.chapter_id', 'chapters.id')
        .join('courses', 'chapters.course_id', 'courses.id')
        .where('lectures.id', lectureId)
        .select('lectures.*', 'courses.instructor_id', 'courses.id as course_id', 'courses.title as course_title')
        .first();
    
    if (!lecture || lecture.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền sửa bài giảng này.');
    }

    // Lấy danh sách chapters của khóa học này
    const chapters = await db('chapters')
        .where('course_id', lecture.course_id)
        .orderBy('chapter_order', 'asc')
        .select('*');

    res.render('vwTeacher/editLecture', { 
        lecture, 
        chapters,
        courseId: lecture.course_id
    });
});

router.post('/lecture/:id/edit', requireAuth, requireInstructor, upload.single('video'), async (req, res) => {
    const lectureId = Number(req.params.id);
    const { title, duration_minutes, is_preview_allowed, chapter_id } = req.body;
    
    const lecture = await db('lectures')
        .join('chapters', 'lectures.chapter_id', 'chapters.id')
        .join('courses', 'chapters.course_id', 'courses.id')
        .where('lectures.id', lectureId)
        .select('courses.instructor_id', 'courses.id as course_id', 'lectures.video_url')
        .first();
    
    if (!lecture || lecture.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền sửa bài giảng này.');
    }

    // ✨ Kiểm tra chapter_id mới (nếu có thay đổi)
    if (chapter_id) {
        const chapterId = Number(chapter_id);
        const chapter = await db('chapters')
            .where({ id: chapterId, course_id: lecture.course_id })
            .first();
        
        if (!chapter) {
            return res.status(400).send('Chương không hợp lệ.');
        }
    }

    const videoUrl = req.file ? `/uploads/lectures/${req.file.filename}` : lecture.video_url;

    await db('lectures').where('id', lectureId).update({
        title,
        video_url: videoUrl,
        duration_minutes: duration_minutes || null,
        is_preview_allowed: is_preview_allowed === 'on' ? 1 : 0,
        chapter_id: chapter_id ? Number(chapter_id) : lecture.chapter_id // ✨ Cập nhật chapter_id nếu có
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
    
    if (!lecture || lecture.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền xóa bài giảng này.');
    }

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
    
    if (!lecture || lecture.instructor_id !== req.session.user.id) {
        return res.status(403).json({ error: 'Không có quyền' });
    }
    
    const newValue = lecture.is_preview_allowed === 1 ? 0 : 1;
    await db('lectures').where('id', lectureId).update({ is_preview_allowed: newValue });
    res.json({ success: true, is_preview_allowed: newValue });
});

// ---------------- Delete Course ----------------
router.post('/course/:id/delete', requireAuth, requireInstructor, async (req, res) => {
    const id = Number(req.params.id);
    const course = await courseModel.detail(id);
    
    if (!course || course.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền xóa khóa học này.');
    }

    const chapters = await db('chapters').where('course_id', id);
    for (const chapter of chapters) {
        await db('lectures').where('chapter_id', chapter.id).del();
    }
    await db('chapters').where('course_id', id).del();
    await db('courses').where('id', id).del();
    
    res.redirect('/teacher/dashboard');
});
// ---------------- Delete Course (from Profile page) ----------------
router.post('/profile/course/:id/delete', requireAuth, requireInstructor, async (req, res) => {
    const id = Number(req.params.id);
    const course = await courseModel.detail(id);

    if (!course || course.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền xóa khóa học này.');
    }

    // Xóa tất cả lectures, chapters, rồi course
    const chapters = await db('chapters').where('course_id', id);
    for (const chapter of chapters) {
        await db('lectures').where('chapter_id', chapter.id).del();
    }
    await db('chapters').where('course_id', id).del();
    await db('courses').where('id', id).del();

    // Xong thì quay lại /teacher/profile
    res.redirect('/teacher/profile');
});

// ---------------- Profile ----------------
router.get('/profile', requireAuth, requireInstructor, async (req, res) => {
    const userId = req.session.user.id;
    const courses = await courseModel.findByInstructor(userId);
    res.render('vwTeacher/profile', { user: req.session.user, courses });
});

router.post('/profile', requireAuth, requireInstructor, upload.single('profile_picture'), async (req, res) => {
    const userId = req.session.user.id;
    const { full_name, email, bio } = req.body;
    const profilePicture = req.file ? `/uploads/avatars/${req.file.filename}` : req.session.user.profile_picture_url;

    await db('users').where({ id: userId }).update({
        full_name,
        email,
        instructor_bio: bio,
        profile_picture_url: profilePicture
    });

    req.session.user.full_name = full_name;
    req.session.user.email = email;
    req.session.user.instructor_bio = bio;
    req.session.user.profile_picture_url = profilePicture;

    res.redirect('/teacher/profile');
});

export default router;