import db from '../utils/db.js';

export default {
    // Đánh dấu bài học đã hoàn thành
    async markAsCompleted(userId, lectureId) {
        try {
            await db('lecture_progress').insert({
                user_id: userId,
                lecture_id: lectureId,
                completed_at: new Date()
            });
            return true;
        } catch (error) {
            // Đã hoàn thành rồi
            if (error.code === '23505') return true;
            throw error;
        }
    },

    // Kiểm tra bài học đã hoàn thành chưa
    async isCompleted(userId, lectureId) {
        const progress = await db('lecture_progress')
            .where({ user_id: userId, lecture_id: lectureId })
            .first();
        return !!progress;
    },

    // Lấy progress của user trong khóa học
    async getCourseProgress(userId, courseId) {
        // Lấy tất cả lectures của khóa học
        const lectures = await db('lectures')
            .leftJoin('chapters', 'chapters.id', 'lectures.chapter_id')
            .where('chapters.course_id', courseId)
            .select('lectures.id as lecture_id');

        const lectureIds = lectures.map(l => l.lecture_id);
        
        if (lectureIds.length === 0) return { completed: 0, total: 0, percentage: 0 };

        // Đếm số bài đã hoàn thành
        const completedCount = await db('lecture_progress')
            .where('user_id', userId)
            .whereIn('lecture_id', lectureIds)
            .count('* as count')
            .first();

        const completed = parseInt(completedCount.count) || 0;
        const total = lectureIds.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { completed, total, percentage };
    },

    // Lấy danh sách bài học đã hoàn thành
    async getCompletedLectures(userId, courseId) {
        return db('lecture_progress')
            .leftJoin('lectures', 'lectures.id', 'lecture_progress.lecture_id')
            .leftJoin('chapters', 'chapters.id', 'lectures.chapter_id')
            .where('lecture_progress.user_id', userId)
            .where('chapters.course_id', courseId)
            .select('lecture_progress.lecture_id');
    }
};