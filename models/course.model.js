import db from '../utils/db.js';

const baseCols = [
    'c.id',
    'c.title',
    'c.price',
    db.raw('c.promotional_price as promo_price'),
    db.raw('c.image_url as cover'),
    db.raw('c.short_description'),
    db.raw('cat.name as category_name'),
    db.raw('cat.id as category_id'),
    db.raw('u.full_name as instructor_name'),
    db.raw('COALESCE(ROUND(AVG(r.rating)::numeric,1),0) as rating'),
    db.raw('COUNT(DISTINCT r.id) as rating_count'),
    db.raw('COUNT(DISTINCT e2.user_id) as students'),
    db.raw("(CASE WHEN COUNT(DISTINCT e2.user_id)>50 OR c.views>1000 THEN true ELSE false END) as is_best_seller"),
    db.raw("(CASE WHEN c.last_updated >= now() - interval '30 days' THEN true ELSE false END) as is_new")
];

// ---- stats helpers for teacher ----
async function getStatistics(courseId) {
    const ratingStats = await db('reviews')
        .where('course_id', courseId)
        .select(
            db.raw('COALESCE(AVG(rating), 0) as rating_average'),
            db.raw('COUNT(*) as rating_count')
        )
        .first();

    const enrollmentStats = await db('enrollments')
        .where('course_id', courseId)
        .count('* as enrolled_count')
        .first();

    return {
        rating_average: parseFloat(ratingStats.rating_average).toFixed(1),
        rating_count: parseInt(ratingStats.rating_count),
        enrolled_count: parseInt(enrollmentStats.enrolled_count)
    };
}

async function checkAndUpdateStatus(courseId) {
    const chapters = await db('chapters').where('course_id', courseId);
    let newStatus;

    if (chapters.length === 0) {
        newStatus = 'draft';
    } else {
        let allChHaveLectures = true;
        for (const ch of chapters) {
            const { count } = await db('lectures').where('chapter_id', ch.id).count('id as count').first();
            if (Number(count) === 0) { allChHaveLectures = false; break; }
        }
        newStatus = allChHaveLectures ? 'completed' : 'incomplete';
    }

    await db('courses').where('id', courseId).update({
        status: newStatus,
        last_updated: db.fn.now()
    });

    return newStatus;
}

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
            .orderBy([
                { column: db.raw('COUNT(DISTINCT e.user_id)'), order: 'desc' },
                { column: 'c.last_updated', order: 'desc' }
            ])
            .limit(limit)
            .select(baseCols);
    },

    async mostViewed(limit = 10) {
        return db({ c: 'courses' })
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.status', 'published')
            .groupBy('c.id', 'cat.id', 'u.id')
            .orderBy('c.views', 'desc')
            .limit(limit)
            .select(baseCols);
    },

    async newest(limit = 10) {
        return db({ c: 'courses' })
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.status', 'published')
            .groupBy('c.id', 'cat.id', 'u.id')
            .orderBy('c.last_updated', 'desc')
            .limit(limit)
            .select(baseCols);
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

    // Public search - remove_accents hỗ trợ tốt TV
    async search({ q = '', categoryId = null, sort = 'rating_desc', page = 1, pageSize = 12 }) {
        const offset = (page - 1) * pageSize;

        const qb = db({ c: 'courses' })
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.status', 'published');

        if (q && q.trim()) {
            const keywords = q.trim().replace(/ /g, ' & ');
            qb.whereRaw('c.fts @@ to_tsquery(remove_accents(?))', [keywords]);
        }

        if (categoryId) qb.andWhere('c.category_id', categoryId);

        const orderBy = [];
        if (q && q.trim()) {
            const keywords = q.trim().replace(/ /g, ' & ');
            orderBy.push({ column: db.raw('ts_rank(c.fts, to_tsquery(remove_accents(?)))', [keywords]), order: 'desc' });
        }

        if (sort === 'price_asc') orderBy.push({ column: db.raw('COALESCE(c.promotional_price, c.price)'), order: 'asc' });
        else if (sort === 'newest') orderBy.push({ column: 'c.last_updated', order: 'desc' });
        else if (sort === 'best_seller') orderBy.push({ column: db.raw('COUNT(DISTINCT e2.user_id)'), order: 'desc' });
        else orderBy.push({ column: db.raw('AVG(r.rating)'), order: 'desc' });

        const rows = await qb.clone()
            .groupBy('c.id', 'cat.id', 'u.id')
            .orderBy(orderBy)
            .limit(pageSize)
            .offset(offset)
            .select(baseCols);

        const countQb = db({ c: 'courses' }).where('c.status', 'published');
        if (q && q.trim()) {
            const keywords = q.trim().replace(/ /g, ' & ');
            countQb.whereRaw('c.fts @@ to_tsquery(remove_accents(?))', [keywords]);
        }
        if (categoryId) countQb.andWhere('c.category_id', categoryId);

        const [{ count }] = await countQb.count();
        return { rows, total: Number(count || 0) };
    },

    // Search theo nhiều category (cha + con)
    async searchByCategories({ categoryIds = [], sort = 'newest', page = 1, pageSize = 12 }) {
        const offset = (page - 1) * pageSize;

        const qb = db({ c: 'courses' })
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.status', 'published')
            .whereIn('c.category_id', categoryIds);

        const orderBy = [];
        if (sort === 'price_asc') orderBy.push({ column: db.raw('COALESCE(c.promotional_price, c.price)'), order: 'asc' });
        else if (sort === 'newest') orderBy.push({ column: 'c.last_updated', order: 'desc' });
        else if (sort === 'best_seller') orderBy.push({ column: db.raw('COUNT(DISTINCT e2.user_id)'), order: 'desc' });
        else orderBy.push({ column: db.raw('AVG(r.rating)'), order: 'desc' });

        const rows = await qb.clone()
            .groupBy('c.id', 'cat.id', 'u.id')
            .orderBy(orderBy)
            .limit(pageSize)
            .offset(offset)
            .select(baseCols);

        const [{ count }] = await db('courses')
            .where('status', 'published')
            .whereIn('category_id', categoryIds)
            .count();

        return { rows, total: Number(count || 0) };
    },

    async detail(id) {
        const course = await db({ c: 'courses' })
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .where('c.id', id)
            .groupBy('c.id', 'u.id', 'cat.id')
            .select([
                'c.*',
                db.raw('COALESCE(ROUND(AVG(r.rating)::numeric,1),0) as rating'),
                db.raw('COUNT(DISTINCT r.id) as rating_count'),
                db.raw('COUNT(DISTINCT e.user_id) as students'),
                db.raw('u.full_name as instructor_name'),
                db.raw('u.instructor_bio as instructor_bio'),
                db.raw('u.profile_picture_url as instructor_avatar'),
                db.raw('cat.name as category_name'),
                db.raw('cat.id as category_id')
            ])
            .first();

        if (course) await db('courses').where('id', id).increment('views', 1);
        return course || null;
    },

    async curriculum(id) {
        const chapters = await db('chapters')
            .where('course_id', id)
            .orderBy('chapter_order', 'asc');

        const lectures = await db('lectures')
            .whereIn('chapter_id', chapters.map(c => c.id))
            .orderBy(['chapter_id', { column: 'lecture_order', order: 'asc' }]);

        return { chapters, lectures };
    },

    async reviews(id, limit = 10) {
        return db({ r: 'reviews' })
            .leftJoin({ u: 'users' }, 'u.id', 'r.user_id')
            .where('r.course_id', id)
            .orderBy('r.created_at', 'desc')
            .limit(limit)
            .select([
                'r.id', 'r.rating', 'r.comment', 'r.created_at',
                db.raw('u.full_name as user_name'),
                db.raw('u.profile_picture_url as user_avatar')
            ]);
    },

    async relatedBestSellers(categoryId, excludeId, limit = 5) {
        return db({ c: 'courses' })
            .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where({ 'c.status': 'published', 'c.category_id': categoryId })
            .andWhereNot('c.id', excludeId)
            .groupBy('c.id', 'cat.id', 'u.id')
            .orderBy(db.raw('COUNT(DISTINCT e.user_id)'), 'desc')
            .limit(limit)
            .select(baseCols);
    },

    // ----- Teacher APIs -----
    async findByInstructor(instructorId) {
        const cols = ['c.id', 'c.title', 'c.price', 'c.promotional_price', 'c.category_id', 'c.status', 'c.instructor_id'];
        const courses = await db({ c: 'courses' })
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.instructor_id', instructorId)
            .groupBy('c.id', 'cat.id', 'u.id')
            .orderBy('c.id', 'desc')
            .select(cols);

        const withStats = await Promise.all(
            courses.map(async (c) => ({ ...c, ...(await getStatistics(c.id)) }))
        );
        return withStats;
    },

    async add(course) {
        const [newCourse] = await db('courses').insert(course).returning('*');
        return newCourse;
    },

    async update(id, changes) {
        const [updated] = await db('courses').where('id', id).update(changes).returning('*');
        return updated;
    },

    checkAndUpdateStatus,
    getStatistics
};
