const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const checkPerm = require('../middleware/checkPermission');

router.use(auth);

// GET all customers
router.get('/', checkPerm('customers.manage'), async (req, res) => {
    try {
        const [customers] = await db.query('SELECT * FROM customers ORDER BY id DESC');
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching customers' });
    }
});

// POST new customer
router.post('/', checkPerm('customers.manage'), async (req, res) => {
    const { name, phone, email, address } = req.body;
    try {
        await db.execute(
            'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
            [name, phone, email, address]
        );
        res.status(201).json({ message: 'Customer added successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Phone number already exists' });
        res.status(500).json({ message: 'Error adding customer' });
    }
});

module.exports = router;