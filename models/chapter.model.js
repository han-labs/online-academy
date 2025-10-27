// course.model.js
import db from '../utils/db.js';

const courseModel = {
    // Lấy tất cả khóa học của 1 instructor
    findByInstructor: async (instructor_id) => {
        return db('courses').where({ instructor_id });
    },

    // Lấy chi tiết khóa học
    detail: async (id) => {
        return db('courses').where({ id }).first();
    },

    // Lấy curriculum: chapters + lectures
    curriculum: async (course_id) => {
        const chapters = await db('chapters')
            .where('course_id', course_id)
            .orderBy('chapter_order', 'asc')
            .select('*');

        const lectures = await db('lectures')
            .whereIn('chapter_id', chapters.map(ch => ch.id))
            .orderBy('lecture_order', 'asc')
            .select('*');

        return { chapters, lectures };
    },

    // Thêm chương mới
    addChapter: async ({ title, course_id }) => {
        const maxOrder = await db('chapters')
            .where('course_id', course_id)
            .max('chapter_order as max')
            .first();
        const nextOrder = (maxOrder?.max || 0) + 1;

        return db('chapters').insert({ title, course_id, chapter_order: nextOrder });
    },

    // Kiểm tra và update status course
    checkAndUpdateStatus: async (course_id) => {
        const chapters = await db('chapters').where({ course_id });
        if (chapters.length > 0) {
            await db('courses').where({ id: course_id }).update({ status: 'active' });
        } else {
            await db('courses').where({ id: course_id }).update({ status: 'draft' });
        }
    }
};

export default courseModel;