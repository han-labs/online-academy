// routes/admin.category.route.js
import { Router } from 'express';
import db from '../utils/db.js';
import { requireAuth, checkAdmin } from '../middlewares/auth.js';
const router = Router();

// list
router.get('/', requireAuth, checkAdmin, async (req, res) => {
    const rows = await db('categories').select('*').orderBy('id', 'asc');
    res.render('vwAdmin/categories/list', { rows });
});

// add
router.get('/add', requireAuth, checkAdmin, (req, res) => {
    res.render('vwAdmin/categories/add');
});
router.post('/add', requireAuth, checkAdmin, async (req, res) => {
    const { name, parent_id } = req.body;
    await db('categories').insert({ name, parent_id: parent_id || null });
    res.redirect('/admin/categories');
});

// edit
router.get('/:id/edit', requireAuth, checkAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const cat = await db('categories').where({ id }).first();
    if (!cat) return res.status(404).render('vwAccount/404');
    res.render('vwAdmin/categories/edit', { cat });
});
router.post('/:id/edit', requireAuth, checkAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const { name, parent_id } = req.body;
    await db('categories').where({ id }).update({ name, parent_id: parent_id || null });
    res.redirect('/admin/categories');
});

// delete (chặn nếu có course)
router.post('/:id/delete', requireAuth, checkAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const [{ exists }] = await db.raw(
        `select exists(select 1 from courses where category_id = ?) as exists`, [id]
    );
    if (exists) { // render thông báo
        const rows = await db('categories').select('*').orderBy('id', 'asc');
        return res.status(400).render('vwAdmin/categories/list', { rows, error: 'Không xoá được: đã có khoá học.' });
    }
    await db('categories').where({ id }).del();
    res.redirect('/admin/categories');
});

export default router;
