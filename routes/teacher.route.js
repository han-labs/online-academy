import db from '../utils/db.js';

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireInstructor } from '../middlewares/auth.js';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';
import chapterModel from '../models/chapter.model.js';
import lectureModel from '../models/lecture.model.js';

const router = Router();

// Multer setup for video/image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = file.mimetype.startsWith('video') 
            ? './public/uploads/lectures' 
            : './public/uploads/courses';
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

// ---------------- Add Course ----------------
router.get('/course/add', requireAuth, requireInstructor, async (req, res) => {
    const categories = await categoryModel.findAll();
    res.render('vwTeacher/addCourse', { categories });
});

router.post('/course/add', requireAuth, requireInstructor, upload.single('image'), async (req, res) => {
    const userId = req.session.user.id;
    const { title, short_description, detailed_description, price, promotional_price, category_id } = req.body;
    const image = req.file ? `/uploads/courses/${req.file.filename}` : null;

    // Khi tạo khóa học mới => is_completed = false
    await courseModel.add({
        title,
        short_description,
        detailed_description,
        price,
        promotional_price,
        category_id: category_id || null,
        instructor_id: userId,
        cover: image,
        is_completed: false,
        status: 'draft'
    });

    res.redirect('/teacher/dashboard');
});

// ---------------- View Course Detail (CHI TIẾT) ----------------
router.get('/course/:id/detail', requireAuth, requireInstructor, async (req, res) => {
    const id = Number(req.params.id);
    const course = await courseModel.detail(id);
    
    // Kiểm tra quyền sở hữu
    if (!course || course.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền xem khóa học này.');
    }

    // Lấy thông tin curriculum (chương và bài giảng)
    const curriculum = await courseModel.curriculum(id);
    
    res.render('vwTeacher/courseDetail', { 
        course, 
        chapters: curriculum.chapters, 
        lectures: curriculum.lectures 
    });
});

// ---------------- Edit Course ----------------
router.get('/course/:id/edit', requireAuth, requireInstructor, async (req, res) => {
    const id = Number(req.params.id);
    const course = await courseModel.detail(id);
    if (!course || course.instructor_id !== req.session.user.id)
        return res.status(403).send('Không có quyền chỉnh sửa khóa học này.');

    const categories = await categoryModel.findAll();
    const curriculum = await courseModel.curriculum(id);
    res.render('vwTeacher/editCourse', { course, categories, chapters: curriculum.chapters, lectures: curriculum.lectures });
});

router.post('/course/:id/edit', requireAuth, requireInstructor, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'lecture_video', maxCount: 1 }
]), async (req, res) => {
    const id = Number(req.params.id);
    const course = await courseModel.detail(id);
    if (!course || course.instructor_id !== req.session.user.id)
        return res.status(403).send('Không có quyền chỉnh sửa khóa học này.');

    const { title, short_description, detailed_description, price, promotional_price, category_id, status } = req.body;
    const image = req.files['image'] ? `/uploads/courses/${req.files['image'][0].filename}` : course.cover;

    // Cập nhật thông tin khóa học
    await courseModel.update(id, {
        title,
        short_description,
        detailed_description,
        price,
        promotional_price,
        category_id: category_id || null,
        cover: image,
        status
    });

    // Xử lý bài giảng mới nếu có
    if (req.files['lecture_video']) {
        const videoFile = `/uploads/lectures/${req.files['lecture_video'][0].filename}`;
        const { chapter_id, lecture_title } = req.body;
        await lectureModel.add({
            chapter_id,
            title: lecture_title,
            video_url: videoFile
        });
    }

    // Kiểm tra hoàn thành khóa học: nếu tất cả chapter có ít nhất 1 lecture => is_completed = true
    const chapters = await chapterModel.findByCourse(id);
    let allCompleted = true;
    for (const ch of chapters) {
        const lectures = await lectureModel.findByChapter(ch.id);
        if (!lectures || lectures.length === 0) allCompleted = false;
    }
    await courseModel.update(id, { is_completed: allCompleted });

    res.redirect('/teacher/dashboard');
});

// ---------------- Delete Course (XÓA KHÓA HỌC) ----------------
router.post('/course/:id/delete', requireAuth, requireInstructor, async (req, res) => {
    const id = Number(req.params.id);
    const course = await courseModel.detail(id);
    
    // Kiểm tra quyền sở hữu
    if (!course || course.instructor_id !== req.session.user.id) {
        return res.status(403).send('Không có quyền xóa khóa học này.');
    }

    // Xóa khóa học (model sẽ xử lý cascade delete chapters, lectures, enrollments)
    await courseModel.delete(id);
    
    res.redirect('/teacher/dashboard');
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

    // Tạo thư mục avatars nếu chưa có
    const avatarDir = './public/uploads/avatars';
    if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

    // Cập nhật vào bảng users
    await db('users').where({ id: userId }).update({
        full_name,
        email,
        instructor_bio: bio,
        profile_picture_url: profilePicture
    });

    // Cập nhật session để hiển thị ngay
    req.session.user.full_name = full_name;
    req.session.user.email = email;
    req.session.user.instructor_bio = bio;
    req.session.user.profile_picture_url = profilePicture;

    res.redirect('/teacher/profile');
});

// THÊM route này vào cuối file, trước export default

// Toggle preview cho lecture
router.post('/lecture/:id/toggle-preview', requireAuth, requireInstructor, async (req, res) => {
    const lectureId = Number(req.params.id);
    
    // Kiểm tra quyền: lecture -> chapter -> course -> instructor
    const lecture = await db('lectures')
        .join('chapters', 'lectures.chapter_id', 'chapters.id')
        .join('courses', 'chapters.course_id', 'courses.id')
        .where('lectures.id', lectureId)
        .select('courses.instructor_id', 'courses.id as course_id')
        .first();
    
    if (!lecture || lecture.instructor_id !== req.session.user.id) {
        return res.status(403).json({ error: 'Không có quyền' });
    }
    
    const newValue = await lectureModel.togglePreview(lectureId);
    res.json({ success: true, is_preview_allowed: newValue });
});

export default router;