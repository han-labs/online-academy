// routes/category.route.js
import { Router } from 'express';
import courseModel from '../models/course.model.js';
const router = Router();

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const page = Number(req.query.page || 1);
    const pageSize = 12;
    const { rows, total } = await courseModel.search({ categoryId: id, page, pageSize, sort: 'newest' });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.render('vwCategory/list', { rows, page, totalPages, categoryId: id, sort: 'newest' });
});

export default router;
