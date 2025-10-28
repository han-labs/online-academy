// models/teacher.model.js
import db from '../utils/db.js';

export default {
    async getCoursesByInstructor(instructorId) {
        return db({ c: 'courses' })
            .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
            .where('c.instructor_id', instructorId)
            .groupBy('c.id')
            .select([
                'c.id',
                'c.title',
                'c.status',
                'c.price',
                db.raw('c.promotional_price as promotional_price'),
                db.raw('COUNT(DISTINCT e.user_id) as students') // 👈 số học viên
            ])
            .orderBy('c.created_at', 'desc');
    },

    // (tuỳ bạn có dùng) lấy 1 khoá cho trang detail của giáo viên
    async getCourseDetailForInstructor(instructorId, courseId) {
        return db({ c: 'courses' })
            .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
            .where('c.instructor_id', instructorId)
            .andWhere('c.id', courseId)
            .groupBy('c.id')
            .first([
                'c.*',
                db.raw('COUNT(DISTINCT e.user_id) as students')
            ]);
    }
};
