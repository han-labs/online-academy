// routes/home.route.js
import { Router } from 'express';
import courseModel from '../models/course.model.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        let [featured, mostViewed, newest, hotCats] = await Promise.all([
            courseModel.featuredThisWeek(4),
            courseModel.mostViewed(10),
            courseModel.newest(10),
            courseModel.topCategoriesThisWeek(8)
        ]);

        // fallback nếu tuần này không có featured
        if (!featured || featured.length === 0) {
            featured = newest.slice(0, 4);
        }

        res.render('vwHome/home', { featured, mostViewed, newest, hotCats });
    } catch (error) {
        console.error('Home page error:', error);
        res.render('vwHome/home', { featured: [], mostViewed: [], newest: [], hotCats: [] });
    }
});

export default router;
