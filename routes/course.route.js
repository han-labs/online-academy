import { Router } from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';
import { requireAuth } from '../middlewares/auth.js';
import watchlistModel from '../models/watchlist.model.js';
import enrollmentModel from '../models/enrollment.model.js';
import progressModel from '../models/progress.model.js';
import reviewModel from '../models/review.model.js'; // THÊM IMPORT
const router = Router();

// Search courses - Route này phải đặt TRƯỚC /:id
router.get('/search', async (req, res) => {
    const q = req.query.q || '';
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
        q,
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
    console.log('=== COURSE DETAIL DEBUG ===');
    console.log('Course ID:', id);
    console.log('User session:', req.session.user);
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

    let isInWatchlist = false;
    if (req.session.user) {
        console.log('Checking watchlist for user:', req.session.user.id);
        try {
            isInWatchlist = await watchlistModel.isInWatchlist(req.session.user.id, id);
            console.log('Is in watchlist result:', isInWatchlist);
        } catch (error) {
            console.error('Watchlist check error:', error);
        }
    } else {
        console.log('No user session - watchlist check skipped');
    }
    console.log('Final isInWatchlist:', isInWatchlist);
    console.log('=== END DEBUG ===');
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
        related,
        isInWatchlist
    });
});

// Learn page - Route cho học viên đã đăng ký (student feature)
// Learn page - Route cho học viên đã đăng ký (student feature)
router.get('/:id/learn', requireAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const userId = req.session.user.id;

        if (isNaN(id)) {
            return res.status(404).render('vwAccount/404');
        }

        // KIỂM TRA ENROLLMENT - THÊM VÀO ĐÂY
        const isEnrolled = await enrollmentModel.isEnrolled(userId, id);
        if (!isEnrolled) {
            return res.redirect(`/courses/${id}?error=not_enrolled`);
        }

        const course = await courseModel.detail(id);
        if (!course) {
            return res.status(404).render('vwAccount/404');
        }

        const curriculum = await courseModel.curriculum(id);

        // NHÓM LECTURES THEO CHAPTERS 
        const chaptersWithLectures = curriculum.chapters.map(chapter => ({
            ...chapter,
            lectures: curriculum.lectures.filter(l => l.chapter_id === chapter.id)
        }));

        const progress = await progressModel.getCourseProgress(userId, id);
        const completedLectures = await progressModel.getCompletedLectures(userId, id);
        const completedLectureIds = completedLectures.map(cl => cl.lecture_id);

        console.log('Progress data:', progress);
        console.log('Completed lectures:', completedLectureIds);

         // LẤY REVIEWS DATA THỰC - THÊM VÀO ĐÂY
        const reviews = await reviewModel.getByCourse(id, 10);
        const ratingStats = await reviewModel.getRatingStats(id);
        const userReview = await reviewModel.getUserReview(userId, id);

        console.log('Reviews data:', {
            reviewsCount: reviews.length,
            ratingStats,
            userReview: userReview ? 'exists' : 'none'
        });

        res.render('vwCourse/learn', {
            course,
            chapters: chaptersWithLectures,
            lectures: curriculum.lectures,
            totalLectures: curriculum.lectures.length,
            progress, //  Truyền progress data
            completedLectureIds ,//  Truyền completed lectures
            reviews,              // ← TRUYỀN REVIEWS THỰC
            ratingStats,          // ← TRUYỀN RATING STATS  
            userReview,           // ← TRUYỀN USER REVIEW
            canReview: !userReview, // ← CÓ THỂ REVIEW KHÔNG
            isLearningPage: true
        });

    } catch (error) {
        console.error('Learning page error:', error);
        res.status(500).render('vwAccount/404');
    }
});



export default router;