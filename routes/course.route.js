import { Router } from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Search courses - Route này phải đặt TRƯỚC /:id
router.get('/search', async (req, res) => {
    const q = req.query.q?.trim() || null;
    const categoryId = req.query.category ? Number(req.query.category) : null;
    const sort = req.query.sort || 'rating_desc';
    const page = Number(req.query.page) || 1;
    const pageSize = 12;

    const { rows, total } = await courseModel.search({
        q,
        categoryId,
        sort,
        page,
        pageSize
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Get category info if searching by category
    let categoryInfo = null;
    if (categoryId) {
        categoryInfo = await categoryModel.findById(categoryId);
    }

    res.render('vwCourse/search', {
        courses: rows,
        q: q || '',
        categoryId,
        categoryInfo,
        sort,
        page,
        totalPages,
        total,
        hasResults: rows.length > 0
    });
});

// Course detail - Route này phải đặt SAU /search
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
        return res.status(404).render('vwAccount/404');
    }

    const course = await courseModel.detail(id);

    if (!course) {
        return res.status(404).render('vwAccount/404');
    }

    const [curriculum, reviews, related] = await Promise.all([
        courseModel.curriculum(id),
        courseModel.reviews(id, 10),
        courseModel.relatedBestSellers(course.category_id, id, 5)
    ]);

    // Group lectures by chapter
    const chaptersWithLectures = curriculum.chapters.map(chapter => ({
        ...chapter,
        lectures: curriculum.lectures.filter(l => l.chapter_id === chapter.id)
    }));

    // Calculate total duration
    const totalMinutes = curriculum.lectures.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    res.render('vwCourse/detail', {
        course,
        chapters: chaptersWithLectures,
        totalChapters: curriculum.chapters.length,
        totalLectures: curriculum.lectures.length,
        totalHours,
        remainingMinutes,
        reviews,
        related
    });
});

// Learn page - Route cho học viên đã đăng ký (student feature)
router.get('/:id/learn', requireAuth, async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
        return res.status(404).render('vwAccount/404');
    }

    const course = await courseModel.detail(id);

    if (!course) {
        return res.status(404).render('vwAccount/404');
    }

    // TODO: Kiểm tra xem user đã đăng ký khóa học này chưa
    // const enrolled = await courseModel.checkEnrollment(req.session.user.id, id);
    // if (!enrolled) {
    //     return res.redirect(`/courses/${id}`);
    // }

    const curriculum = await courseModel.curriculum(id);

    res.render('vwCourse/learn', {
        course,
        chapters: curriculum.chapters,
        lectures: curriculum.lectures
    });
});

export default router;