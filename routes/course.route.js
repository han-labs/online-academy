// routes/course.route.js
import { Router } from 'express';
import courseModel from '../models/course.model.js';
const router = Router();
import watchlistModel from '../models/watchlist.model.js';
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


// /courses/:id - Xem chi tiết khóa học
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);

    try {
        const course = await courseModel.detail(id);
        if (!course) return res.status(404).render('vwAccount/404', { error: 'Khóa học không tồn tại' });

        const [curriculum, relatedCourses, reviews] = await Promise.all([
            courseModel.curriculum(id),
            courseModel.relatedBestSellers(course.category_id, id, 5),
            courseModel.reviews(id)
        ]);

        let isInWatchlist = false;
        if (req.session.user?.role === 'student') {
            isInWatchlist = await watchlistModel.check(req.session.user.id, id);
        }

        res.render('vwCourse/detail', {
            course,
            chapters: curriculum.chapters,
            lectures: curriculum.lectures,
            reviews,
            relatedCourses,
            isInWatchlist
        });

    } catch (error) {
        console.error('Course detail route error:', error);
        res.status(500).render('vwAccount/404', { error: 'Có lỗi xảy ra khi tải chi tiết khóa học' });
    }
});


import { requireAuth } from '../middlewares/auth.js';

router.get('/:id/learn', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const course = await courseModel.detail(id);
    if (!course) return res.status(404).render('vwAccount/404');
    res.render('vwCourse/learn', { course });
});


export default router;
