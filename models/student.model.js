import db from '../utils/db.js';
import watchlistModel from '../models/watchlist.model.js';
import { requireAuth } from '../middlewares/auth.js';
import { Router } from 'express';

const router = Router();

// Thêm khóa học vào watchlist
router.post('/watchlist/add/:courseId', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const courseId = Number(req.params.courseId);
    try {
        await watchlistModel.add(userId, courseId);
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.redirect('back');
    }
});

// Xoá khóa học khỏi watchlist
router.post('/watchlist/remove/:courseId', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const courseId = Number(req.params.courseId);
    try {
        await watchlistModel.remove(userId, courseId);
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.redirect('back');
    }
});

// Xem danh sách watchlist
router.get('/watchlist', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const courses = await watchlistModel.findByUser(userId);
    res.render('vwStudent/watchlist', { courses });
});

export default router;
