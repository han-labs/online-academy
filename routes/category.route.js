import { Router } from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';

const router = Router();

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const page = Number(req.query.page || 1);
    const sort = req.query.sort || 'newest';
    const pageSize = 12;

    if (isNaN(id)) {
        return res.status(404).render('vwAccount/404');
    }

    const category = await categoryModel.findById(id);

    if (!category) {
        return res.status(404).render('vwAccount/404');
    }

    // Lấy tất cả category IDs (bao gồm cả children nếu có)
    const categoryIds = await categoryModel.getCategoryWithChildren(id);

    // Search courses trong tất cả categories (parent + children)
    const { rows, total } = await courseModel.searchByCategories({
        categoryIds,
        page,
        pageSize,
        sort
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Get subcategories nếu là parent category
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
});

export default router;