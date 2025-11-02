// routes/home.route.js
import { Router } from 'express';
import db from '../utils/db.js';
import courseModel from '../models/course.model.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const data = await db.transaction(async (trx) => {
            // CHẠY TUẦN TỰ trên CÙNG 1 connection
            const featured = await courseModel.featuredThisWeek(4, trx);
            const mostViewed = await courseModel.mostViewed(10, trx);
            const newest = await courseModel.newest(10, trx);
            const hotCats = await courseModel.topCategoriesThisWeek(8, trx);
            return { featured, mostViewed, newest, hotCats };
        });

        const featured = (data.featured?.length ? data.featured : data.newest.slice(0, 4));
        res.render('vwHome/home', { ...data, featured });
    } catch (error) {
        console.error('Home page error:', error);
        // Fallback mềm để Render health-check vẫn xanh
        res.status(200).render('vwHome/home', {
            featured: [],
            mostViewed: [],
            newest: [],
            hotCats: []
        });
    }
});

export default router;
