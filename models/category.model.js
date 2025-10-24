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

    async getSubcategories(parentId) {
        return db('categories')
            .where('parent_id', parentId)
            .select('id', 'name')
            .orderBy('name');
    },

    // Lấy tất cả IDs của category và subcategories
    async getCategoryWithChildren(categoryId) {
        const category = await this.findById(categoryId);
        if (!category) return [];

        // Nếu là category con (có parent_id)
        if (category.parent_id) {
            return [categoryId];
        }

        // Nếu là category cha, lấy tất cả con
        const children = await this.getSubcategories(categoryId);
        
        // Trả về [categoryId, ...childrenIds]
        return [categoryId, ...children.map(c => c.id)];
    }
};