import db from '../utils/db.js';

export default {
    async findAll() { return db('categories').select('id', 'name', 'parent_id').orderBy('name'); },
    async findTree() {
        const rows = await db('categories').select('id', 'name', 'parent_id').orderBy(['parent_id', 'name']);
        const parents = rows.filter(r => !r.parent_id).map(p => ({ ...p, children: rows.filter(c => c.parent_id === p.id) }));
        return parents;
    }
};
