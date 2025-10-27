import db from '../utils/db.js';

export default {
    async findByEmail(email) {
        try { return await db('users').where({ email }).first(); }
        catch { return null; }
    }
};
