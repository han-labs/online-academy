// routes/home.route.js
import { Router } from 'express';
import courseModel from '../models/course.model.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const featured = await courseModel.featuredThisWeek(4);
        const mostViewed = await courseModel.mostViewed(10);
        const newest = await courseModel.newest(10);
        const hotCats = await courseModel.topCategoriesThisWeek(8);

        const hero = (featured?.length ? featured : newest.slice(0, 4));
        res.render('vwHome/home', {
            featured: hero,
            mostViewed,
            newest,
            hotCats
        });
    } catch (error) {
        console.error('Home page error:', error);
        res.status(200).render('vwHome/home', {
            featured: [],
            mostViewed: [],
            newest: [],
            hotCats: []
        });
    }
});

export default router;
