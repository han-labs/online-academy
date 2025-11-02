// routes/home.route.js
import { Router } from 'express';
import db from '../utils/db.js';
import courseModel from '../models/course.model.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        // Gộp TẤT CẢ truy vấn trang Home vào 1 transaction => dùng CHUNG 1 connection
        const data = await db.transaction(async (trx) => {
            const featured = await courseModel.featuredThisWeek(4, trx);
            const mostViewed = await courseModel.mostViewed(10, trx);
            const newest = await courseModel.newest(10, trx);
            const hotCats = await courseModel.topCategoriesThisWeek(8, trx);

            return { featured, mostViewed, newest, hotCats };
        });

        // fallback nếu tuần này không có featured
        const featured = (data.featured?.length ? data.featured : data.newest.slice(0, 4));

        res.render('vwHome/home', { ...data, featured });
    } catch (error) {
        console.error('Home page error:', error);
        // Fallback mềm để Render health-check không làm app “đỏ”
        res.status(200).render('vwHome/home', {
            featured: [],
            mostViewed: [],
            newest: [],
            hotCats: []
        });
    }
});

export default router;













// // routes/home.route.js
// import { Router } from 'express';
// import courseModel from '../models/course.model.js';

// const router = Router();

// router.get('/', async (req, res) => {
//     try {
//         let [featured, mostViewed, newest, hotCats] = await Promise.all([
//             courseModel.featuredThisWeek(4),
//             courseModel.mostViewed(10),
//             courseModel.newest(10),
//             courseModel.topCategoriesThisWeek(8)
//         ]);

//         // fallback nếu tuần này không có featured
//         if (!featured || featured.length === 0) {
//             featured = newest.slice(0, 4);
//         }

//         res.render('vwHome/home', { featured, mostViewed, newest, hotCats });
//     } catch (error) {
//         console.error('Home page error:', error);
//         res.render('vwHome/home', { featured: [], mostViewed: [], newest: [], hotCats: [] });
//     }
// });

// export default router;
