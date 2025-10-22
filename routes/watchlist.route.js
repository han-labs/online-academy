import { Router } from 'express';
import watchlistModel from '../models/watchlist.model.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Xem danh sách Watchlist
router.get('/', requireAuth, async (req, res) => {
    const courses = await watchlistModel.getByUser(req.session.user.id);
    res.render('vwStudent/watchlist', { courses });
});

// Thêm vào Watchlist
router.post('/:courseId', requireAuth, async (req, res) => {
    const courseId = Number(req.params.courseId);
    await watchlistModel.add(req.session.user.id, courseId);
    res.json({ success: true });
});

// Xoá khỏi Watchlist
router.delete('/:courseId', requireAuth, async (req, res) => {
    const courseId = Number(req.params.courseId);
    await watchlistModel.remove(req.session.user.id, courseId);
    res.json({ success: true });
});

export default router;
