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
    },

    async toggleCompletion(userId, lectureId) {
        try {
            // Kiểm tra xem đã hoàn thành chưa
            const existing = await this.isCompleted(userId, lectureId);

            if (existing) {
                // Nếu đã hoàn thành → xóa (bỏ tích)
                await db('lecture_progress')
                    .where({ user_id: userId, lecture_id: lectureId })
                    .del();
                return { action: 'removed', completed: false };
            } else {
                // Nếu chưa hoàn thành → thêm (tích)
                await db('lecture_progress').insert({
                    user_id: userId,
                    lecture_id: lectureId,
                    completed_at: new Date()
                });
                return { action: 'added', completed: true };
            }
        } catch (error) {
            console.error('Toggle progress error:', error);
            throw error;
        }
    },
    // Thêm hàm này vào cuối file models/progress.model.js
    // models/progress.model.js - Thêm debug
async isCourseCompleted(userId, courseId) {
    console.log(`🔍 Checking if course ${courseId} completed by user ${userId}`);
    
    // Lấy tất cả lectures của khóa học
    const totalLectures = await db('lectures as l')
        .leftJoin('chapters as ch', 'ch.id', 'l.chapter_id')
        .where('ch.course_id', courseId)
        .count('* as total')
        .first();

    const total = parseInt(totalLectures?.total) || 0;
    console.log(`📊 Total lectures in course ${courseId}: ${total}`);

    if (total === 0) {
        console.log(`⚠️ Course ${courseId} has no lectures`);
        return false;
    }

    // Đếm số bài đã hoàn thành
    const completedLectures = await db('lecture_progress as lp')
        .leftJoin('lectures as l', 'l.id', 'lp.lecture_id')
        .leftJoin('chapters as ch', 'ch.id', 'l.chapter_id')
        .where('lp.user_id', userId)
        .where('ch.course_id', courseId)
        .count('* as completed')
        .first();

    const completed = parseInt(completedLectures?.completed) || 0;
    console.log(`✅ Completed lectures: ${completed}/${total}`);

    // Khóa học hoàn thành khi tất cả bài giảng đã được tích
    return completed === total;
}
};
