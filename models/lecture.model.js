// models/lecture.model.js
import db from '../utils/db.js';

async function togglePreview(lectureId) {
    const lecture = await db('lectures')
        .where('id', lectureId)
        .select('is_preview_allowed')
        .first();

    if (!lecture) {
        throw new Error(`Lecture with id ${lectureId} not found`);
    }

    const newValue = !lecture.is_preview_allowed;

    await db('lectures')
        .where('id', lectureId)
        .update({ is_preview_allowed: newValue });

    return newValue;
}

export default {
    async findByChapterId(chapterId) {
        return db('lectures')
            .where({ chapter_id: chapterId })
            .orderBy('lecture_order', 'asc');
    },

    async findById(id) {
        return db('lectures').where({ id }).first();
    },

    async create(lecture) {
        return db('lectures').insert(lecture).returning('*');
    },

    async update(id, lecture) {
        return db('lectures').where({ id }).update(lecture);
    },

    async delete(id) {
        return db('lectures').where({ id }).del();
    },

    // ✅ Thêm mới function togglePreview
    togglePreview
};
