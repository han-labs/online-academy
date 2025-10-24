import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import watchlistModel from '../models/watchlist.model.js';

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
            req.session.flash = { type: 'success', message: 'Đã thêm vào danh sách yêu thích' };
        } else {
            req.session.flash = { type: 'info', message: 'Khóa học đã có trong danh sách yêu thích' };
        }
    } catch (error) {
        console.error(' Watchlist add error:', error);
        req.session.flash = { type: 'error', message: 'Có lỗi xảy ra: ' + error.message };
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
            message: success ? 'Đã xóa khỏi danh sách yêu thích' : 'Không tìm thấy khóa học' 
        };
    } catch (error) {
        console.error('Remove from watchlist error:', error);
        req.session.flash = { type: 'error', message: 'Có lỗi xảy ra' };
    }

    res.redirect(referer); 
});

export default router;