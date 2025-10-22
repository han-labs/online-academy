// routes/course.route.js
import { Router } from 'express';
import courseModel from '../models/course.model.js';
const router = Router();

// /courses?q=&category=&sort=&page=
router.get('/', async (req, res) => {
    const q = req.query.q || '';
    const categoryId = req.query.category ? Number(req.query.category) : null;
    const sort = req.query.sort || 'rating_desc';
    const page = Number(req.query.page || 1);
    const pageSize = 12;

    const { rows, total } = await courseModel.search({ q, categoryId, sort, page, pageSize });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.render('vwCategory/list', { rows, page, totalPages, q, sort, categoryId });
});


// GET /courses/:id - Xem chi tiết khóa học
router.get('/courses/:id', async (req, res) => {
    const id = Number(req.params.id);

    try {
        // 1️⃣ Lấy chi tiết khóa học
        const course = await courseModel.detail(id);
        if (!course) {
            return res.status(404).render('vwAccount/404', { error: 'Khóa học không tồn tại' });
        }

        // 2️⃣ Lấy đề cương khóa học
        const { chapters, lectures } = await courseModel.curriculum(id);

        // 3️⃣ Lấy đánh giá học viên
        const reviews = await courseModel.reviews(id);

        // 4️⃣ Lấy 5 khóa học khác cùng lĩnh vực bestsellers
        const relatedCourses = await courseModel.relatedBestSellers(course.category_id, course.id, 5);

        // Render view
        res.render('vwCourse/detail', {
            course,
            chapters,
            lectures,
            reviews,
            relatedCourses
        });

    } catch (error) {
        console.error('Course detail route error:', error);
        res.status(500).render('vwAccount/404', { error: 'Có lỗi xảy ra khi tải chi tiết khóa học' });
    }
});

// /courses/:id detail
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const course = await courseModel.detail(id);
    if (!course) return res.status(404).render('vwAccount/404');
    const [{ chapters, lectures }, related, reviews] = await Promise.all([
        courseModel.curriculum(id),
        courseModel.relatedBestSellers(course.category_id, id, 5),
        courseModel.reviews(id)
    ]);
    res.render('vwCourse/detail', { course, related, reviews, chapters, lectures });
});


import { requireAuth } from '../middlewares/auth.js';

router.get('/:id/learn', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const course = await courseModel.detail(id);
    if (!course) return res.status(404).render('vwAccount/404');
    res.render('vwCourse/learn', { course });
});


export default router;
