// routes/student.route.js
import { Router } from 'express';
import studentModel from '../models/student.model.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// GET /student/watchlist
router.get('/watchlist', requireAuth, async (req, res) => {
    const studentId = req.session.user.id; //  dùng user thay vì authUser
    const watchlist = await studentModel.getWatchlist(studentId);
    res.render('vwStudent/watchlist', {
        watchlist,
        empty: watchlist.length === 0
    });
});

// POST /student/watchlist/add/:courseId
router.post('/watchlist/add/:courseId', requireAuth, async (req, res) => {
    const studentId = req.session.user.id; // 
    const courseId = Number(req.params.courseId);
    await studentModel.addToWatchlist(studentId, courseId);
    res.redirect(`/courses/${courseId}`);
});

// POST /student/watchlist/remove/:courseId
router.post('/watchlist/remove/:courseId', requireAuth, async (req, res) => {
    const studentId = req.session.user.id; // 
    const courseId = Number(req.params.courseId);
    await studentModel.removeFromWatchlist(studentId, courseId);
    res.redirect('/student/watchlist');
});

export default router;
