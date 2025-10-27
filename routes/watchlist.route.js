import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import watchlistModel from '../models/watchlist.model.js';

const router = Router();

// GET /student/watchlist - Xem danh sách watchlist
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
            hasCourses: false,
            error: 'Có lỗi xảy ra khi tải danh sách'
        });
    }
});

// POST /student/watchlist/add - Thêm vào watchlist
router.post('/watchlist/add', requireAuth, async (req, res) => {
    const { course_id } = req.body;
    const userId = req.session.user.id;

    if (!course_id) {
        return res.redirect('back');
    }

    try {
        const success = await watchlistModel.addToWatchlist(userId, course_id);
        
        if (success) {
            req.session.flash = { type: 'success', message: 'Đã thêm vào danh sách yêu thích' };
        } else {
            req.session.flash = { type: 'info', message: 'Khóa học đã có trong danh sách yêu thích' };
        }
    } catch (error) {
        console.error('Add to watchlist error:', error);
        req.session.flash = { type: 'error', message: 'Có lỗi xảy ra' };
    }

    res.redirect('back');
});

// POST /student/watchlist/remove - Xóa khỏi watchlist
router.post('/watchlist/remove', requireAuth, async (req, res) => {
    const { course_id } = req.body;
    const userId = req.session.user.id;

    if (!course_id) {
        return res.redirect('back');
    }

    try {
        const success = await watchlistModel.removeFromWatchlist(userId, course_id);
        
        if (success) {
            req.session.flash = { type: 'success', message: 'Đã xóa khỏi danh sách yêu thích' };
        } else {
            req.session.flash = { type: 'error', message: 'Không tìm thấy khóa học trong danh sách' };
        }
    } catch (error) {
        console.error('Remove from watchlist error:', error);
        req.session.flash = { type: 'error', message: 'Có lỗi xảy ra' };
    }

    res.redirect('back');
});

export default router;