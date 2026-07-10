const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const checkPerm = require('../middleware/checkPermission');

router.use(auth);

// GET /api/roles - Fetch all roles and their permissions
router.get('/', checkPerm('roles.manage'), async (req, res) => {
    try {
        const [roles] = await db.query('SELECT * FROM roles');
        const [perms] = await db.query(`
            SELECT rp.role_id, p.permission_key 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id
        `);
        
        const response = roles.map(r => ({
            ...r,
            permissions: perms.filter(p => p.role_id === r.id).map(p => p.permission_key)
        }));
        res.json(response);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching roles' });
    }
});

// POST /api/roles - Create a new custom role with permissions
router.post('/', checkPerm('roles.manage'), async (req, res) => {
    const { name, permissions } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [roleRes] = await connection.execute('INSERT INTO roles (name) VALUES (?)', [name]);
        const roleId = roleRes.insertId;

        if (permissions && permissions.length > 0) {
            const [allPerms] = await connection.query('SELECT id, permission_key FROM permissions');
            for (const key of permissions) {
                const match = allPerms.find(p => p.permission_key === key);
                if (match) {
                    await connection.execute(
                        'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
                        [roleId, match.id]
                    );
                }
            }
        }
        await connection.commit();
        res.status(201).json({ message: 'Role created successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Error creating role' });
    } finally {
        connection.release();
    }
});

module.exports = router;