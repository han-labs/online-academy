import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import progressModel from '../models/progress.model.js';

const router = Router();

// POST /api/progress/complete - Đánh dấu bài học đã hoàn thành
router.post('/complete', requireAuth, async (req, res) => {
    try {
        const { lecture_id } = req.body;
        const userId = req.session.user.id;

        const success = await progressModel.markAsCompleted(userId, lecture_id);
        
        res.json({ 
            success: true, 
            message: 'The lesson has been marked complete.'
        });

    } catch (error) {
        console.error('Progress complete error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred.' 
        });
    }
});

// GET /api/progress/completed/:courseId
router.get('/completed/:courseId', requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.session.user.id;
        
        const completedLectures = await progressModel.getCompletedLectures(userId, courseId);
        const completedIds = completedLectures.map(item => item.lecture_id);
        
        res.json({ 
            success: true,
            data: completedIds
        });
    } catch (error) {
        console.error('Get completed lectures error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred.' 
        });
    }
});


// GET /api/progress/:courseId - Lấy progress data của khóa học
router.get('/:courseId', requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.session.user.id;

        console.log('🔍 API Progress - courseId:', courseId, 'userId:', userId);

        const progress = await progressModel.getCourseProgress(userId, courseId);
        
        res.json({ 
            success: true,
            data: progress
        });

    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred.' 
        });
    }
});

// POST /api/progress/toggle - Toggle trạng thái hoàn thành
router.post('/toggle', requireAuth, async (req, res) => {
    try {
        const { lecture_id } = req.body;
        const userId = req.session.user.id;

        if (!lecture_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Loss lecture_id' 
            });
        }

        const result = await progressModel.toggleCompletion(userId, lecture_id);
        
        res.json({ 
            success: true, 
            message: result.completed ? 'Marked complete' : 'Unmarked complete',
            data: result
        });

    } catch (error) {
        console.error('Toggle progress error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred.' 
        });
    }
});
export default router;