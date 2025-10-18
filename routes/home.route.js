import { Router } from 'express';
import courseModel from '../models/course.model.js';
const router = Router();

router.get('/', async (req, res) => {
    const [featured, mostViewed, newest, hotCats] = await Promise.all([
        courseModel.featuredThisWeek(4),
        courseModel.mostViewed(10),
        courseModel.newest(10),
        courseModel.topCategoriesThisWeek(8)
    ]);
    res.render('vwHome/home', { featured, mostViewed, newest, hotCats });
});
export default router;
