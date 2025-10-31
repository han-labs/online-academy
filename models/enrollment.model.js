import db from '../utils/db.js';

export default {
    // Ghi danh vào khóa học
    async enroll(userId, courseId) {
        try {
            await db('enrollments').insert({
                user_id: userId,
                course_id: courseId,
                enrolled_at: new Date()
            });
            return true;
        } catch (error) {
            // Nếu đã ghi danh rồi
            if (error.code === '23505') return false;
            throw error;
        }
    },

    // Kiểm tra đã ghi danh chưa
    async isEnrolled(userId, courseId) {
        const enrollment = await db('enrollments')
            .where({ user_id: userId, course_id: courseId })
            .first();
        return !!enrollment;
    },

    // Lấy danh sách khóa học đã ghi danh
    async getEnrolledCourses(userId) {
        return db({ e: 'enrollments' })
            .leftJoin({ c: 'courses' }, 'c.id', 'e.course_id')
            .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
            .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
            .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
            .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id') 
            .where('e.user_id', userId)
            .andWhere('c.status', 'published')
            .groupBy('e.enrolled_at', 'c.id', 'u.id', 'cat.id')
            .orderBy('e.enrolled_at', 'desc')
            .select([
                'c.id', 'c.title', 'c.short_description', 'c.price',
                db.raw('c.promotional_price as promo_price'),
                db.raw('c.image_url as cover'),
                db.raw('cat.name as category_name'),
                db.raw('u.full_name as instructor_name'),
                db.raw('COALESCE(ROUND(AVG(r.rating)::numeric,1),0) as rating'),
                db.raw('COUNT(DISTINCT r.id) as rating_count'),
                db.raw('COUNT(DISTINCT e2.user_id) as students'),
                'e.enrolled_at'
            ]);
    }
};