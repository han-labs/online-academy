import db from '../utils/db.js';

const baseCols = [
    'c.id', 'c.title', 'c.price',
    db.raw('c.promotional_price as promo_price'),
    db.raw('c.image_url as cover'),
    db.raw('cat.name as category_name'),
    db.raw('u.full_name as instructor_name'),
    db.raw('COALESCE(ROUND(AVG(r.rating)::numeric,1),0) as rating'),
    db.raw('COUNT(r.id) as rating_count'),
    db.raw("(CASE WHEN COUNT(e2.user_id)>50 OR c.views>1000 THEN true ELSE false END) as is_best_seller")
];

export default {
    async featuredThisWeek(limit = 4) {
        return db({ c: 'courses' })
            .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.status', 'published')
            .andWhere('e.enrolled_at', '>=', db.raw("now() - interval '7 days'"))
            .groupBy('c.id', 'cat.id', 'u.id')
            .orderBy([{ column: db.raw('COUNT(e.user_id)'), order: 'desc' }, { column: 'c.last_updated', order: 'desc' }])
            .limit(limit).select(baseCols);
    },
    async mostViewed(limit = 10) {
        return db({ c: 'courses' })
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.status', 'published').groupBy('c.id', 'cat.id', 'u.id')
            .orderBy('c.views', 'desc').limit(limit).select(baseCols);
    },
    async newest(limit = 10) {
        return db({ c: 'courses' })
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.status', 'published').groupBy('c.id', 'cat.id', 'u.id')
            .orderBy('c.last_updated', 'desc').limit(limit).select(baseCols);
    },
    async topCategoriesThisWeek(limit = 8) {
        return db({ c: 'courses' })
            .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .where('e.enrolled_at', '>=', db.raw("now() - interval '7 days'"))
            .groupBy('cat.id')
            .orderBy(db.raw('COUNT(e.user_id)'), 'desc')
            .limit(limit)
            .select(['cat.id', 'cat.name', db.raw('COUNT(e.user_id) as enroll_count')]);
    },


    async search({ q = '', categoryId = null, sort = 'rating_desc', page = 1, pageSize = 12 }) {
        const offset = (page - 1) * pageSize;
        const qb = db({ c: 'courses' })
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.status', 'published');

        if (q) qb.andWhereRaw("c.fts @@ plainto_tsquery('simple', ?)", [q]);
        if (categoryId) qb.andWhere('c.category_id', categoryId);

        const order = (() => {
            if (q) return [{ column: db.raw("ts_rank(c.fts, plainto_tsquery('simple', ?))", [q]), order: 'desc' }];
            if (sort === 'price_asc') return [{ column: 'c.promotional_price', order: 'asc' }, { column: 'c.price', order: 'asc' }];
            if (sort === 'newest') return [{ column: 'c.last_updated', order: 'desc' }];
            return [{ column: db.raw('AVG(r.rating)'), order: 'desc' }];
        })();

        const rows = await qb.groupBy('c.id', 'cat.id', 'u.id').orderBy(order).limit(pageSize).offset(offset).select(baseCols);

        const countQ = db('courses').where('status', 'published');
        if (q) countQ.andWhereRaw("fts @@ plainto_tsquery('simple', ?)", [q]);
        if (categoryId) countQ.andWhere('category_id', categoryId);
        const [{ count }] = await countQ.count();
        return { rows, total: Number(count || 0) };
    },

    async detail(id) {
        const course = await db({ c: 'courses' })
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
            .where('c.id', id).groupBy('c.id', 'u.id')
            .select([
                'c.*',
                db.raw('COALESCE(ROUND(AVG(r.rating)::numeric,1),0) as rating'),
                db.raw('COUNT(r.id) as rating_count'),
                db.raw('COUNT(e.user_id) as students'),
                db.raw('u.full_name as instructor_name'),
                db.raw('u.instructor_bio as instructor_bio'),
                db.raw('u.profile_picture_url as instructor_avatar')
            ]).first();
        return course || null;
    },
    async curriculum(id) {
        const chapters = await db('chapters').where('course_id', id).orderBy('chapter_order', 'asc');
        const lectures = await db('lectures').whereIn('chapter_id', chapters.map(c => c.id)).orderBy(['chapter_id', { column: 'lecture_order', order: 'asc' }]);
        return { chapters, lectures };
    },
    async reviews(id) {
        return db({ r: 'reviews' })
            .leftJoin({ u: 'users' }, 'u.id', 'r.user_id')
            .where('r.course_id', id)
            .orderBy('r.created_at', 'desc')
            .select(['r.id', 'r.rating', 'r.comment', 'r.created_at', db.raw('u.full_name as user_name')]);
    },
    async relatedBestSellers(categoryId, excludeId, limit = 5) {
        return db({ c: 'courses' })
            .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .where({ 'c.status': 'published', 'c.category_id': categoryId }).andWhereNot('c.id', excludeId)
            .groupBy('c.id', 'cat.id', 'u.id')
            .orderBy(db.raw('COUNT(e.user_id)'), 'desc')
            .limit(limit)
            .select(baseCols);
    },
    async relatedByCategory(categoryId, excludeId, limit = 5) {
        return db({ c: 'courses' }).leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .where({ 'c.status': 'published', 'c.category_id': categoryId }).andWhereNot('c.id', excludeId)
            .groupBy('c.id').orderBy('c.views', 'desc').limit(limit).select(baseCols);
    }
};
