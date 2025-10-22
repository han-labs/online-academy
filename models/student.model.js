import db from '../utils/db.js';

export default {
  // Lấy danh sách khóa học yêu thích của học viên
  async getWatchlist(userId) {
    return await db('watchlists as w')
      .join('courses as c', 'w.course_id', 'c.id')
      .join('users as u', 'c.instructor_id', 'u.id')
      .where('w.user_id', userId)
      .select(
        'c.id',
        'c.title',
        'c.short_description',
        'c.image_url',
        'c.promotional_price',
        'c.price',
        'u.full_name as instructor_name'
      )
      .orderBy('w.added_at', 'desc');
  },

  // Thêm khóa học vào danh sách yêu thích
  async addToWatchlist(userId, courseId) {
    const existed = await db('watchlists')
      .where({ user_id: userId, course_id: courseId })
      .first();
    if (!existed) {
      await db('watchlists').insert({
        user_id: userId,
        course_id: courseId,
        added_at: new Date()
      });
    }
  },

  // Xóa khóa học khỏi danh sách yêu thích
  async removeFromWatchlist(userId, courseId) {
    await db('watchlists')
      .where({ user_id: userId, course_id: courseId })
      .del();
  }
};
