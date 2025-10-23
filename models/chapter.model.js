// models/chapter.model.js
import db from '../utils/db.js';

export default {
    async findByCourseId(courseId) {
        return db('chapters')
            .where({ course_id: courseId })
            .orderBy('chapter_order', 'asc');
    },

    async findById(id) {
        return db('chapters').where({ id }).first();
    },

    async create(chapter) {
        return db('chapters').insert(chapter).returning('*');
    },

    async update(id, chapter) {
        return db('chapters').where({ id }).update(chapter);
    },

    async delete(id) {
        return db('chapters').where({ id }).del();
    }
};
