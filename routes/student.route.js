import { Router } from 'express';
import studentModel from '../models/student.model.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

/**
 * GET /student/watchlist
 * Hiển thị danh sách khóa học yêu thích
 */
router.get('/watchlist', requireAuth, async (req, res) => {
  const userId = req.session.authUser.id;
  const watchlist = await studentModel.getWatchlist(userId);
  res.render('vwStudent/watchlist', {
    layout: 'main',
    watchlist,
    empty: watchlist.length === 0
  });
});

/**
 * POST /student/watchlist/add/:courseId
 * Thêm khóa học vào danh sách yêu thích
 */
router.post('/watchlist/add/:courseId', requireAuth, async (req, res) => {
  const userId = req.session.authUser.id;
  const courseId = Number(req.params.courseId);
  await studentModel.addToWatchlist(userId, courseId);
  res.redirect(`/courses/${courseId}`);
});

/**
 * POST /student/watchlist/remove/:courseId
 * Xóa khóa học khỏi danh sách yêu thích
 */
router.post('/watchlist/remove/:courseId', requireAuth, async (req, res) => {
  const userId = req.session.authUser.id;
  const courseId = Number(req.params.courseId);
  await studentModel.removeFromWatchlist(userId, courseId);
  res.redirect('/student/watchlist');
});

export default router;
