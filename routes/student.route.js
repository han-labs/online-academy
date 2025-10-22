// routes/student.route.js
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import watchlistModel from '../models/watchlist.model.js';

const router = Router();

// Xem danh sách khóa học yêu thích (Watchlist)
router.get('/watchlist', requireAuth, async (req, res) => {
    try {
        const courses = await watchlistModel.getByUser(req.session.user.id);
        res.render('vwStudent/watchlist', { courses });
    } catch (err) {
        console.error('Lỗi lấy watchlist:', err);
        res.status(500).render('vwAccount/404', { error: 'Có lỗi xảy ra khi tải danh sách yêu thích' });
    }
});

// Bạn có thể thêm các route khác cho student ở đây nếu cần
// ví dụ: /my-courses, ...

export default router;
