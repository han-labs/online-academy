import db from '../utils/db.js';

export default {
  async findAll() {
    return db('categories')
      .select('id', 'name', 'parent_id')
      .orderBy('name');
  },

  async findTree() {
    const rows = await db('categories')
      .select('id', 'name', 'parent_id')
      .orderBy(['parent_id', 'name']);

    const parents = rows
      .filter(r => !r.parent_id)
      .map(p => ({
        ...p,
        children: rows.filter(c => c.parent_id === p.id)
      }));

    return parents;
  },

  async findById(id) {
    return db('categories')
      .where('id', id)
      .select('id', 'name', 'parent_id')
      .first();
  },

  // async getSubcategories(parentId) {
  //   return db('categories')
  //     .where('parent_id', parentId)
  //     .select('id', 'name')
  //     .orderBy('name');
  // },

  // // Lấy tất cả IDs của category và subcategories
  // async getCategoryWithChildren(categoryId) {
  //   const category = await this.findById(categoryId);
  //   if (!category) return [];

  //   if (category.parent_id) return [categoryId];

  //   const children = await this.getSubcategories(categoryId);
  //   return [categoryId, ...children.map(c => c.id)];
  // },
  // Lấy tất cả id con/cháu (bao gồm cả chính nó)
  async getDescendantIds(rootId) {
    const sql = `
      WITH RECURSIVE subcats AS (
        SELECT id FROM categories WHERE id = ?
        UNION ALL
        SELECT c.id
        FROM categories c
        INNER JOIN subcats s ON c.parent_id = s.id
      )
      SELECT id FROM subcats
    `;
    const result = await db.raw(sql, [Number(rootId)]);
    const rows = result?.rows ?? result; // PG trả về {rows:[]}
    return rows.map(r => r.id);
  },

  // Back-compat API bạn đang gọi ở nơi khác
  async getCategoryWithChildren(categoryId) {
    const ids = await this.getDescendantIds(categoryId);
    return ids.length ? ids : [Number(categoryId)];
  },

  async getSubcategories(parentId) {
    return db('categories')
      .where('parent_id', parentId)
      .select('id', 'name')
      .orderBy('name');
  },
};
