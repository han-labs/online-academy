import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import watchlistModel from '../models/watchlist.model.js';
import reviewModel from '../models/review.model.js'; // ← ĐẢM BẢO CÓ DÒNG NÀY
const router = Router();

// GET /student/watchlist
router.get('/watchlist', requireAuth, async (req, res) => {
    try {
        const courses = await watchlistModel.getByUser(req.session.user.id);
        res.render('vwStudent/watchlist', { 
            courses,
            hasCourses: courses.length > 0
        });
    } catch (error) {
        console.error('Watchlist error:', error);
        res.render('vwStudent/watchlist', { 
            courses: [],
            hasCourses: false
        });
    }
});

// POST /student/watchlist/add
router.post('/watchlist/add', requireAuth, async (req, res) => {
    console.log('=== WATCHLIST ADD DEBUG ===');
    console.log('User ID:', req.session.user?.id);
    console.log('Request body:', req.body);
    console.log('Course ID from body:', req.body.course_id);

    const { course_id } = req.body;
    const userId = req.session.user.id;
    const referer = req.get('Referer') || '/'; 

    if (!course_id) {
        console.log('No course_id in request body');
        return res.redirect(referer); // 
    }

    try {
        console.log(' Attempting to add to watchlist...');
        const success = await watchlistModel.addToWatchlist(userId, course_id);
        console.log(' Watchlist add result:', success);
        
        if (success) {
            req.session.flash = { type: 'success', message: 'Added to favorites list' };
        } else {
            req.session.flash = { type: 'info', message: 'The course is already in your favorites list.' };
        }
    } catch (error) {
        console.error(' Watchlist add error:', error);
        req.session.flash = { type: 'error', message: 'an error occurred: ' + error.message };
    }

    res.redirect(referer); 
});

// POST /student/watchlist/remove
router.post('/watchlist/remove', requireAuth, async (req, res) => {
    const { course_id } = req.body;
    const userId = req.session.user.id;
    const referer = req.get('Referer') || '/'; 

    if (!course_id) return res.redirect(referer); 

    try {
        const success = await watchlistModel.removeFromWatchlist(userId, course_id);
        req.session.flash = { 
            type: success ? 'success' : 'error', 
            message: success ? 'Removed from favorites list' : 'No course found' 
        };
    } catch (error) {
        console.error('Remove from watchlist error:', error);
        req.session.flash = { type: 'error', message: 'an error occurred' };
    }

    res.redirect(referer); 
});

// POST /student/reviews - Thêm đánh giá
router.post('/reviews', requireAuth, async (req, res) => {
    try {
        const { course_id, rating, comment } = req.body;
        const userId = req.session.user.id;

        console.log('=== REVIEW SUBMISSION ===');
        console.log('User:', userId);
        console.log('Course:', course_id);
        console.log('Rating:', rating);
        console.log('Comment:', comment);

        // Validation
        if (!course_id || !rating || !comment) {
            return res.status(400).json({ 
                success: false, 
                message: 'Lack of assessment information' 
            });
        }

        // Kiểm tra user đã review chưa
        const existingReview = await reviewModel.getUserReview(userId, course_id);
        if (existingReview) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already rated this course' 
            });
        }

        // Tạo review mới
        const newReview = await reviewModel.create({
            user_id: userId,
            course_id: parseInt(course_id),
            rating: parseInt(rating),
            comment: comment.trim()
        });

        // Cập nhật thống kê rating cho course
        //await reviewModel.updateCourseRating(course_id);

        console.log('New review created:', newReview);

        res.json({ 
            success: true, 
            message: 'Thanks for your review!',
            review: newReview
        });

    } catch (error) {
        console.error('Review submission error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'an error occurred: ' + error.message 
        });
    }
});

// DELETE /student/reviews - Xóa đánh giá
router.delete('/reviews', requireAuth, async (req, res) => {
    try {
        const { course_id } = req.body;
        const userId = req.session.user.id;

        if (!course_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Loss course_id' 
            });
        }

        const deleted = await reviewModel.delete(userId, course_id);

        if (deleted) {
            // Cập nhật thống kê rating sau khi xóa
            await reviewModel.updateCourseRating(course_id);
            
            res.json({ 
                success: true, 
                message: 'Review deleted' 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'No reviews found' 
            });
        }

    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'an error occurred' 
        });
    }
});


export default router;