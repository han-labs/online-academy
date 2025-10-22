import db from '../utils/db.js';

export default {
    async add(userId, courseId) {
        return db('watchlists').insert({ user_id: userId, course_id: courseId });
    },

    async remove(userId, courseId) {
        return db('watchlists').where({ user_id: userId, course_id: courseId }).del();
    },

    async getByUser(userId) {
        return db('watchlists')
            .join('courses', 'watchlists.course_id', 'courses.id')
            .select('courses.*', 'watchlists.added_at')
            .where('watchlists.user_id', userId)
            .orderBy('watchlists.added_at', 'desc');
    },

    async check(userId, courseId) {
        const row = await db('watchlists')
            .where({ user_id: userId, course_id: courseId })
            .first();
        return !!row; // true nếu đã có, false nếu chưa
    }
};
