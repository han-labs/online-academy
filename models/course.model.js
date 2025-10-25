import db from '../utils/db.js';
const baseCols = [
'c.id', 'c.title', 'c.price',
db.raw('c.promotional_price as promo_price'),
db.raw('c.image_url',),
db.raw('cat.name as category_name'),
db.raw('cat.id as category_id'),
db.raw('u.full_name as instructor_name'),
db.raw('COALESCE(ROUND(AVG(r.rating)::numeric,1),0) as rating'),
db.raw('COUNT(DISTINCT r.id) as rating_count'),
db.raw('COUNT(DISTINCT e2.user_id) as students'),
db.raw("(CASE WHEN COUNT(DISTINCT e2.user_id)>50 OR c.views>1000 THEN true ELSE false END) as is_best_seller"),
db.raw("(CASE WHEN c.last_updated >= now() - interval '30 days' THEN true ELSE false END) as is_new")
];
async function getStatistics(courseId) {
const ratingStats = await db('reviews')
.where('course_id', courseId)
.select(
db.raw('COALESCE(AVG(rating), 0) as rating_average'),
db.raw('COUNT(*) as rating_count')
)
.first();
const enrollmentStats = await db('enrollments')
    .where('course_id', courseId)
    .count('* as enrolled_count')
    .first();

return {
    rating_average: parseFloat(ratingStats.rating_average).toFixed(1),
    rating_count: parseInt(ratingStats.rating_count),
    enrolled_count: parseInt(enrollmentStats.enrolled_count)
};
}
// ✨ HÀM MỚI: Kiểm tra và tự động cập nhật status
async function checkAndUpdateStatus(courseId) {
// Lấy tất cả chapters
const chapters = await db('chapters')
.where('course_id', courseId);
let newStatus;

// Trường hợp 1: Không có chapter nào → draft
if (chapters.length === 0) {
    newStatus = 'draft';
} else {
    // Trường hợp 2: Kiểm tra xem tất cả chapters có lecture chưa
    let allChaptersHaveLectures = true;
    
    for (const chapter of chapters) {
        const lectureCount = await db('lectures')
            .where('chapter_id', chapter.id)
            .count('id as count')
            .first();
        
        if (lectureCount.count === 0) {
            allChaptersHaveLectures = false;
            break;
        }
    }
    
    // Nếu tất cả chapters đều có lecture → completed
    // Nếu không → incomplete
    newStatus = allChaptersHaveLectures ? 'completed' : 'incomplete';
}

// Cập nhật status và last_updated
await db('courses')
    .where('id', courseId)
    .update({ 
        status: newStatus,
        last_updated: db.fn.now()
    });

return newStatus;
}
export default {
async featuredThisWeek(limit = 4) {
return db({ c: 'courses' })
.leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
.leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
.leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
.leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
.leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
.where('c.status', 'published')
.andWhere('e.enrolled_at', '>=', db.raw("now() - interval '7 days'"))
.groupBy('c.id', 'cat.id', 'u.id')
.orderBy([
{ column: db.raw('COUNT(DISTINCT e.user_id)'), order: 'desc' },
{ column: 'c.last_updated', order: 'desc' }
])
.limit(limit)
.select(baseCols);
},
async mostViewed(limit = 10) {
    return db({ c: 'courses' })
        .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
        .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
        .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
        .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
        .where('c.status', 'published')
        .groupBy('c.id', 'cat.id', 'u.id')
        .orderBy('c.views', 'desc')
        .limit(limit)
        .select(baseCols);
},

async newest(limit = 10) {
    return db({ c: 'courses' })
        .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
        .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
        .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
        .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
        .where('c.status', 'published')
        .groupBy('c.id', 'cat.id', 'u.id')
        .orderBy('c.last_updated', 'desc')
        .limit(limit)
        .select(baseCols);
},

async topCategoriesThisWeek(limit = 8) {
    return db({ c: 'courses' })
        .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
        .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
        .where('e.enrolled_at', '>=', db.raw("now() - interval '7 days'"))
        .groupBy('cat.id')
        .orderBy(db.raw('COUNT(e.user_id)'), 'desc')
        .limit(limit)
        .select(['cat.id', 'cat.name', db.raw('COUNT(e.user_id) as enroll_count')]);
},

async search({ q = '', categoryId = null, sort = 'rating_desc', page = 1, pageSize = 12 }) {
    const offset = (page - 1) * pageSize;
    
    const qb = db({ c: 'courses' })
        .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
        .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
        .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
        .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
        .where('c.status', 'published');

    if (q && q.trim()) {
        qb.andWhereRaw(
            "to_tsvector('simple', c.title || ' ' || COALESCE(c.short_description,'') || ' ' || COALESCE(c.detailed_description,'')) @@ plainto_tsquery('simple', ?)",
            [q.trim()]
        );
    }

    if (categoryId) {
        qb.andWhere('c.category_id', categoryId);
    }

    let orderBy = [];
    if (q && q.trim()) {
        orderBy.push({
            column: db.raw(
                "ts_rank(to_tsvector('simple', c.title || ' ' || COALESCE(c.short_description,'') || ' ' || COALESCE(c.detailed_description,'')), plainto_tsquery('simple', ?))",
                [q.trim()]
            ),
            order: 'desc'
        });
    }

    if (sort === 'price_asc') {
        orderBy.push({ column: db.raw('COALESCE(c.promotional_price, c.price)'), order: 'asc' });
    } else if (sort === 'newest') {
        orderBy.push({ column: 'c.last_updated', order: 'desc' });
    } else if (sort === 'best_seller') {
        orderBy.push({ column: db.raw('COUNT(DISTINCT e2.user_id)'), order: 'desc' });
    } else {
        orderBy.push({ column: db.raw('AVG(r.rating)'), order: 'desc' });
    }

    const rows = await qb
        .clone()
        .groupBy('c.id', 'cat.id', 'u.id')
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset)
        .select(baseCols);

    const countQb = db({ c: 'courses' })
        .where('c.status', 'published');

    if (q && q.trim()) {
        countQb.andWhereRaw(
            "to_tsvector('simple', c.title || ' ' || COALESCE(c.short_description,'') || ' ' || COALESCE(c.detailed_description,'')) @@ plainto_tsquery('simple', ?)",
            [q.trim()]
        );
    }
    if (categoryId) {
        countQb.andWhere('c.category_id', categoryId);
    }

    const [{ count }] = await countQb.count();
    return { rows, total: Number(count || 0) };
},

async detail(id) {
    const course = await db({ c: 'courses' })
        .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
        .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
        .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
        .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
        .where('c.id', id)
        .groupBy('c.id', 'u.id', 'cat.id')
        .select([
            'c.*',
            db.raw('COALESCE(ROUND(AVG(r.rating)::numeric,1),0) as rating'),
            db.raw('COUNT(DISTINCT r.id) as rating_count'),
            db.raw('COUNT(DISTINCT e.user_id) as students'),
            db.raw('u.full_name as instructor_name'),
            db.raw('u.instructor_bio as instructor_bio'),
            db.raw('u.profile_picture_url as instructor_avatar'),
            db.raw('cat.name as category_name'),
            db.raw('cat.id as category_id')
        ])
        .first();

    if (course) {
        await db('courses').where('id', id).increment('views', 1);
        const stats = await getStatistics(id);
        return { ...course, ...stats };
    }

    return null;
},

async curriculum(id) {
    const chapters = await db('chapters')
        .where('course_id', id)
        .orderBy('chapter_order', 'asc');

    const lectures = await db('lectures')
        .whereIn('chapter_id', chapters.map(c => c.id))
        .orderBy(['chapter_id', { column: 'lecture_order', order: 'asc' }]);

    return { chapters, lectures };
},

async reviews(id, limit = 10) {
    return db({ r: 'reviews' })
        .leftJoin({ u: 'users' }, 'u.id', 'r.user_id')
        .where('r.course_id', id)
        .orderBy('r.created_at', 'desc')
        .limit(limit)
        .select([
            'r.id', 'r.rating', 'r.comment', 'r.created_at',
            db.raw('u.full_name as user_name'),
            db.raw('u.profile_picture_url as user_avatar')
        ]);
},

async relatedBestSellers(categoryId, excludeId, limit = 5) {
    return db({ c: 'courses' })
        .leftJoin({ e: 'enrollments' }, 'e.course_id', 'c.id')
        .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
        .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
        .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
        .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
        .where({ 'c.status': 'published', 'c.category_id': categoryId })
        .andWhereNot('c.id', excludeId)
        .groupBy('c.id', 'cat.id', 'u.id')
        .orderBy(db.raw('COUNT(DISTINCT e.user_id)'), 'desc')
        .limit(limit)
        .select(baseCols);
},

async findByInstructor(instructorId) {
    // Các cột cơ bản của khóa học, đảm bảo có 'status'
    const baseCols = [
        'c.id',
        'c.title',
        'c.price',
        'c.promotional_price',
        'c.category_id',
        'c.status',       // 🔹 thêm status
        'c.instructor_id'
    ];

    // Lấy khóa học của giảng viên kèm category, instructor, reviews, enrollments
    const courses = await db({ c: 'courses' })
        .leftJoin({ r: 'reviews' }, 'r.course_id', 'c.id')
        .leftJoin({ cat: 'categories' }, 'cat.id', 'c.category_id')
        .leftJoin({ u: 'users' }, 'u.id', 'c.instructor_id')
        .leftJoin({ e2: 'enrollments' }, 'e2.course_id', 'c.id')
        .where('c.instructor_id', instructorId)
        .groupBy('c.id', 'cat.id', 'u.id')
        .orderBy('c.id', 'desc')
        .select(baseCols);

    // Bổ sung stats cho mỗi khóa học
    const coursesWithStats = await Promise.all(
        courses.map(async (course) => {
            const stats = await getStatistics(course.id); // lượt học, rating...
            return { ...course, ...stats };
        })
    );

    return coursesWithStats;
},


// ➕ Thêm khóa học mới
async add(course) {
    const [newCourse] = await db('courses').insert(course).returning('*');
    return newCourse;
},

// ✏️ Cập nhật khóa học
async update(id, changes) {
    const [updated] = await db('courses').where('id', id).update(changes).returning('*');
    return updated;
},

// ✨ HÀM MỚI: Export để sử dụng trong routes
checkAndUpdateStatus,
getStatistics
};