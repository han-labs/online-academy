// routes/category.route.js - FIXED VERSION
import { Router } from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';

const router = Router();

// GET /categories/:id - Hiển thị tất cả courses của category
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const page = Number(req.query.page || 1);
    const sort = req.query.sort || 'newest';
    const pageSize = 12;

    try {
        // Lấy thông tin category
        const categories = await categoryModel.findAll();
        const currentCategory = categories.find(c => c.id === id);

        if (!currentCategory) {
            return res.status(404).render('vwAccount/404', {
                error: 'Category không tồn tại'
            });
        }

        // Lấy danh sách courses theo category
        const { rows, total } = await courseModel.search({ 
            categoryId: id, 
            page, 
            pageSize, 
            sort 
        });

        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        // Render view với đầy đủ thông tin
        res.render('vwCategory/list', {
            category: currentCategory,           // Thông tin category hiện tại
            rows,                                // Danh sách courses
            page,                                // Trang hiện tại
            totalPages,                          // Tổng số trang
            total,                               // Tổng số courses
            categoryId: id,                      // ID category
            sort,                                // Kiểu sắp xếp
            hasCourses: rows.length > 0          // Check có course không
        });

    } catch (error) {
        console.error('Category route error:', error);
        res.status(500).render('vwAccount/404', {
            error: 'Có lỗi xảy ra khi tải courses'
        });
    }
});

export default router;