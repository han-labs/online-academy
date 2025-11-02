// // routes/home.route.js
// import { Router } from 'express';
// import courseModel from '../models/course.model.js';

// const router = Router();

// router.get('/', async (req, res) => {
//     try {
//         const featured = await courseModel.featuredThisWeek(4);
//         const mostViewed = await courseModel.mostViewed(10);
//         const newest = await courseModel.newest(10);
//         const hotCats = await courseModel.topCategoriesThisWeek(8);

//         const hero = (featured?.length ? featured : newest.slice(0, 4));
//         res.render('vwHome/home', {
//             featured: hero,
//             mostViewed,
//             newest,
//             hotCats
//         });
//     } catch (error) {
//         console.error('Home page error:', error);
//         res.status(200).render('vwHome/home', {
//             featured: [],
//             mostViewed: [],
//             newest: [],
//             hotCats: []
//         });
//     }
// });

// export default router;

import { Router } from 'express';
import db from '../utils/db.js';
import courseModel from '../models/course.model.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const { featured, mostViewed, newest, hotCats } = await db.transaction(async (trx) => {
            const newest = await courseModel.newest(10, trx);
            let featured = await courseModel.featuredThisWeek(4, trx);
            if (!featured || featured.length === 0) featured = newest.slice(0, 4);
            const mostViewed = await courseModel.mostViewed(10, trx);
            const hotCats = await courseModel.topCategoriesThisWeek(8, trx);
            return { featured, mostViewed, newest, hotCats };
        });

        res.render('vwHome/home', { featured, mostViewed, newest, hotCats });
    } catch (error) {
        console.error('Home page error:', error);
        res.render('vwHome/home', { featured: [], mostViewed: [], newest: [], hotCats: [] });
    }
});

export default router;
