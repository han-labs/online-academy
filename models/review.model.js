import db from '../utils/db.js';

const reviewModel = {
    // Lấy reviews của khóa học
    async getByCourse(courseId, limit = 10) {
        const reviews = await db('reviews as r')
            .join('users as u', 'r.user_id', 'u.id')
            .where('r.course_id', courseId)
            .select(
                'r.*',
                'u.full_name as user_name',
                'u.profile_picture_url as user_avatar'
            )
            .orderBy('r.created_at', 'desc')
            .limit(limit);

        return reviews;
    },

    // Lấy review của user cho khóa học
    async getUserReview(userId, courseId) {
        const review = await db('reviews as r')
            .join('users as u', 'r.user_id', 'u.id')
            .where({
                'r.user_id': userId,
                'r.course_id': courseId
            })
            .select(
                'r.*',
                'u.full_name as user_name',
                'u.profile_picture_url as user_avatar'
            )
            .first();

        return review;
    },

    // Lấy thống kê rating
    async getRatingStats(courseId) {
        const stats = await db('reviews')
            .where('course_id', courseId)
            .select(
                db.raw('COUNT(*) as total_reviews'),
                db.raw('AVG(rating) as average_rating'),
                db.raw('COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star'),
                db.raw('COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star'),
                db.raw('COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star'),
                db.raw('COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star'),
                db.raw('COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star')
            )
            .first();

        if (stats && stats.total_reviews > 0) {
            const total = stats.total_reviews;
            return [
                { stars: 5, count: stats.five_star, percentage: Math.round((stats.five_star / total) * 100) },
                { stars: 4, count: stats.four_star, percentage: Math.round((stats.four_star / total) * 100) },
                { stars: 3, count: stats.three_star, percentage: Math.round((stats.three_star / total) * 100) },
                { stars: 2, count: stats.two_star, percentage: Math.round((stats.two_star / total) * 100) },
                { stars: 1, count: stats.one_star, percentage: Math.round((stats.one_star / total) * 100) }
            ];
        }

        return [];
    },

    // Tạo review mới
    async create(reviewData) {
        try {
            const [review] = await db('reviews')
                .insert(reviewData)
                .returning('*');
            return review;
        } catch (error) {
            console.error('Create review error:', error);
            throw error;
        }
    },

    // Xóa review
    async delete(userId, courseId) {
        const deleted = await db('reviews')
            .where({
                user_id: userId,
                course_id: courseId
            })
            .delete();

        return deleted > 0;
    },

    
    
};

export default reviewModel;