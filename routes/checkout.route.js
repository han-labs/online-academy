import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import courseModel from '../models/course.model.js';
import enrollmentModel from '../models/enrollment.model.js';
const router = Router();

// GET /checkout/:courseId
router.get('/:courseId', requireAuth, async (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        const userId = req.session.user.id;

        // Lấy thông tin khóa học
        const course = await courseModel.detail(courseId);
        
        if (!course) {
            return res.status(404).render('vwAccount/404');
        }

        // TODO: Kiểm tra xem user đã mua khóa học này chưa

        res.render('vwCheckout/checkout', {
            course,
            user: req.session.user
        });

    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).render('vwAccount/404');
    }
});

// POST /checkout/:courseId/process - Xử lý thanh toán
router.post('/:courseId/process', requireAuth, async (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        const userId = req.session.user.id;

        // Ghi danh vào khóa học
        const success = await enrollmentModel.enroll(userId, courseId);
        
        if (success) {
            res.redirect(`/checkout/${courseId}/success`);
        } else {
            // Đã ghi danh rồi
            res.redirect(`/courses/${courseId}/learn`);
        }

    } catch (error) {
        console.error('Checkout process error:', error);
        res.redirect(`/checkout/${courseId}?error=1`);
    }
});

// GET /checkout/:courseId/success - Trang thành công
router.get('/:courseId/success', requireAuth, async (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        const course = await courseModel.detail(courseId);

        if (!course) {
            return res.status(404).render('vwAccount/404');
        }

        res.render('vwCheckout/success', {
            course,
            user: req.session.user
        });

    } catch (error) {
        console.error('Checkout success error:', error);
        res.status(500).render('vwAccount/404');
    }
});

export default router;