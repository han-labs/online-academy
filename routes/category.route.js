// routes/category.route.js
import { Router } from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';

const router = Router();

// Chỉ cho phép các giá trị sort hợp lệ (khớp UI)
const ALLOWED_SORTS = new Set(['rating_desc', 'price_asc', 'newest', 'best_seller']);

router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(404).render('vwAccount/404');

        // Sort mặc định: Top Rated = rating_desc (khớp list.handlebars)
        const sortRaw = req.query.sort || 'rating_desc';
        const sort = ALLOWED_SORTS.has(sortRaw) ? sortRaw : 'rating_desc';

        // Ép page >= 1
        const pageRaw = Number(req.query.page);
        const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
        const pageSize = 12;

        const category = await categoryModel.findById(id);
        if (!category) return res.status(404).render('vwAccount/404');

        // Lấy tất cả id con/cháu (bao gồm chính nó)
        const categoryIds = await categoryModel.getCategoryWithChildren(id);

        // Tìm course theo nhiều category id
        const { rows, total } = await courseModel.searchByCategories({
            categoryIds, page, pageSize, sort
        });

        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        // Nếu người dùng truy cập page > totalPages, điều hướng về trang cuối
        if (page > totalPages) {
            return res.redirect(`/categories/${id}?sort=${sort}&page=${totalPages}`);
        }

        const subcategories = await categoryModel.getSubcategories(id);

        res.render('vwCategory/list', {
            category,
            subcategories,
            courses: rows,
            page,
            totalPages,
            total,
            sort,
            hasResults: rows.length > 0
        });
    } catch (err) {
        console.error('Category page error:', err);
        // Tuỳ app bạn có trang 500 riêng hay dùng 404. Dùng 500 nếu có.
        return res.status(500).render('vwAccount/500');
    }
});

export default router;
