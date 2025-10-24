import db from '../utils/db.js';

export default {
    async addToWatchlist(userId, courseId) {
        try {
            await db('watchlists').insert({
                user_id: userId,
                course_id: courseId
            });
            return true;
        } catch (error) {
            if (error.code === '23505') return false; // Đã tồn tại
            throw error;
        }
    },

    async removeFromWatchlist(userId, courseId) {
        const deleted = await db('watchlists')
            .where({ user_id: userId, course_id: courseId })
            .del();
        return deleted > 0;
    },

    async getByUser(userId) {
        console.log('=== GET WATCHLIST DEBUG ===');
        console.log('User ID:', userId);

        try {
            const result = await db({ w: 'watchlists' })
                .leftJoin({ c: 'courses' }, 'c.id', 'w.course_id')
                .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
                .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
                .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
                .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id') // THÊM DÒNG NÀY
                .where('w.user_id', userId)
                .andWhere('c.status', 'published')
                .groupBy('w.added_at', 'c.id', 'u.id', 'cat.id')
                .orderBy('w.added_at', 'desc')
                .select([
                    'c.id', 'c.title', 'c.short_description', 'c.price',
                    db.raw('c.promotional_price as promo_price'),
                    db.raw('c.image_url as cover'),
                    db.raw('cat.name as category_name'),
                    db.raw('u.full_name as instructor_name'),
                    db.raw('COALESCE(ROUND(AVG(r.rating)::numeric,1),0) as rating'),
                    db.raw('COUNT(DISTINCT r.id) as rating_count'),
                    db.raw('COUNT(DISTINCT e.user_id) as students'), // GIỜ 'e' ĐÃ CÓ
                    'w.added_at'
                ]);

            console.log('Full query result:', result);
            console.log('Result length:', result.length);
            return result;

        } catch (error) {
            console.error('Error in getByUser:', error);
            return [];
        }
    },

    async isInWatchlist(userId, courseId) {
        const exists = await db('watchlists')
            .where({ user_id: userId, course_id: courseId })
            .first();
        return !!exists;
    }
};