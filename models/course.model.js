import db from '../utils/db.js';

const baseCols = [
    'c.id', 'c.title', 'c.price',
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

export default {
    async featuredThisWeek(limit = 4) {
        const result = await db({ c: 'courses' })
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

        return result;
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

    // FULL-TEXT SEARCH với remove_accents
    async search({ q = '', categoryId = null, sort = 'rating_desc', page = 1, pageSize = 12 }) {
        const offset = (page - 1) * pageSize;

        const qb = db({ c: 'courses' })
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.status', 'published');

        // Full-text search với remove_accents (bỏ dấu tiếng Việt)
        if (q && q.trim()) {
            const keywords = q.trim().replace(/ /g, ' & '); // "lap trinh" -> "lap & trinh"
            qb.whereRaw('c.fts @@ to_tsquery(remove_accents(?))', [keywords]);
        }

        if (categoryId) {
            qb.andWhere('c.category_id', categoryId);
        }

        // Sorting
        let orderBy = [];

        // Nếu có search query, ưu tiên rank theo độ liên quan
        if (q && q.trim()) {
            orderBy.push({
                column: db.raw("ts_rank(c.fts, plainto_tsquery('english', ?))", [q.trim()]),
                order: 'desc'
            });
        }

        // Thêm sort thứ cấp
        if (sort === 'price_asc') {
            orderBy.push({ column: db.raw('COALESCE(c.promotional_price, c.price)'), order: 'asc' });
        } else if (sort === 'newest') {
            orderBy.push({ column: 'c.last_updated', order: 'desc' });
        } else if (sort === 'best_seller') {
            orderBy.push({ column: db.raw('COUNT(DISTINCT e2.user_id)'), order: 'desc' });
        } else {
            // rating_desc (default)
            orderBy.push({ column: db.raw('AVG(r.rating)'), order: 'desc' });
        }

        const rows = await qb
            .clone()
            .groupBy('c.id', 'cat.id', 'u.id')
            .orderBy(orderBy)
            .limit(pageSize)
            .offset(offset)
            .select(baseCols);

        // Count query
        const countQb = db({ c: 'courses' })
            .where('c.status', 'published');

        if (q && q.trim()) {
            const keywords = q.trim().replace(/ /g, ' & ');
            countQb.whereRaw('c.fts @@ to_tsquery(remove_accents(?))', [keywords]);
        }
        if (categoryId) {
            countQb.andWhere('c.category_id', categoryId);
        }

        const [{ count }] = await countQb.count();
        return { rows, total: Number(count || 0) };
    },

    // Search by multiple categories (parent + children)
    async searchByCategories({ categoryIds = [], sort = 'newest', page = 1, pageSize = 12 }) {
        const offset = (page - 1) * pageSize;

        const qb = db({ c: 'courses' })
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.status', 'published')
            .whereIn('c.category_id', categoryIds);

        // Sorting
        let orderBy = [];
        if (sort === 'price_asc') {
            orderBy.push({ column: db.raw('COALESCE(c.promotional_price, c.price)'), order: 'asc' });
        } else if (sort === 'newest') {
            orderBy.push({ column: 'c.last_updated', order: 'desc' });
        } else if (sort === 'best_seller') {
            orderBy.push({ column: db.raw('COUNT(DISTINCT e2.user_id)'), order: 'desc' });
        } else {
            // rating_desc (default)
            orderBy.push({ column: db.raw('AVG(r.rating)'), order: 'desc' });
        }

        const rows = await qb
            .clone()
            .groupBy('c.id', 'cat.id', 'u.id')
            .orderBy(orderBy)
            .limit(pageSize)
            .offset(offset)
            .select(baseCols);

        // Count query
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

        if (course) {
            // Increment views
            await db('courses').where('id', id).increment('views', 1);
        }

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

        if (course) {
            // Increment views
            await db('courses').where('id', id).increment('views', 1);
        }

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

    async search({ q = '', categoryId = null, sort = 'rating_desc', page = 1, pageSize = 12 }) {
        const offset = (page - 1) * pageSize;

        const qb = db({ c: 'courses' })
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
            .where('c.status', 'published');

        // Full-text search
        if (q && q.trim()) {
            const cleanQ = q.trim();
            qb.andWhere(function () {
                this.whereRaw("c.fts @@ plainto_tsquery('english', ?)", [cleanQ])
                    .orWhereRaw("c.title ILIKE ?", [`%${cleanQ}%`]);
            });
        }

        if (categoryId) {
            qb.andWhere('c.category_id', categoryId);
        }

        // Sorting
        let orderBy = [];
        if (q && q.trim()) {
            orderBy.push({
                column: db.raw(
                    "ts_rank(to_tsvector('simple', c.title || ' ' || COALESCE(c.short_description,'') || ' ' || COALESCE(c.detailed_description,'')), plainto_tsquery('simple', ?))",
                    [q.trim()]
                ),
                order: 'desc'
            });
        }

        if (sort === 'price_asc') {
            orderBy.push({ column: db.raw('COALESCE(c.promotional_price, c.price)'), order: 'asc' });
        } else if (sort === 'newest') {
            orderBy.push({ column: 'c.last_updated', order: 'desc' });
        } else if (sort === 'best_seller') {
            orderBy.push({ column: db.raw('COUNT(DISTINCT e2.user_id)'), order: 'desc' });
        } else {
            // rating_desc (default)
            orderBy.push({ column: db.raw('AVG(r.rating)'), order: 'desc' });
        }

        const rows = await qb
            .clone()
            .groupBy('c.id', 'cat.id', 'u.id')
            .orderBy(orderBy)
            .limit(pageSize)
            .offset(offset)
            .select(baseCols);

        // Count query
        const countQb = db({ c: 'courses' })
            .where('c.status', 'published');

        if (q && q.trim()) {
            const cleanQ = q.trim();
            countQb.andWhere(function () {
                this.whereRaw("c.fts @@ plainto_tsquery('english', ?)", [cleanQ])
                    .orWhereRaw("c.title ILIKE ?", [`%${cleanQ}%`]);
            });
        }
        if (categoryId) {
            countQb.andWhere('c.category_id', categoryId);
        }

        const [{ count }] = await countQb.count();
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

        if (course) {
            // Increment views
            await db('courses').where('id', id).increment('views', 1);
        }

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
    }
};