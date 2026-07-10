const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const checkPerm = require('../middleware/checkPermission');

router.use(auth);

// GET /api/users/roles - Fetch available roles for the dropdown
router.get('/roles', checkPerm('roles.manage'), async (req, res) => {
    try {
        const [roles] = await db.query('SELECT id, name FROM roles ORDER BY id ASC');
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching roles' });
    }
});

// GET /api/users - Fetch all staff members
router.get('/', checkPerm('users.manage'), async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT u.id, u.name, u.email, u.is_active, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            ORDER BY u.id DESC
        `);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// POST /api/users - Create a new staff account
router.post('/', checkPerm('users.manage'), async (req, res) => {
    const { name, email, password, role_id } = req.body;
    
    try {
        // Hash the password before saving
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        await db.execute(
            'INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
            [name, email, password_hash, role_id]
        );
        res.status(201).json({ message: 'Staff member added successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email address already in use' });
        }
        res.status(500).json({ message: 'Error creating user' });
    }
});

module.exports = router;