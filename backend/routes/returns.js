const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const checkPerm = require('../middleware/checkPermission');

router.use(auth);

// GET /api/returns - Fetch all processed returns
router.get('/', checkPerm('sales.view'), async (req, res) => {
    try {
        const [returns] = await db.query('SELECT * FROM returns ORDER BY id DESC');
        res.json(returns);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching returns' });
    }
});

// POST /api/returns - Process an item refund and return stock
router.post('/', checkPerm('sales.return'), async (req, res) => {
    const { order_id, product_id, qty, refund_amount, reason } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Log the return
        await connection.execute(
            'INSERT INTO returns (order_id, product_id, qty, refund_amount, reason) VALUES (?, ?, ?, ?, ?)',
            [order_id, product_id, qty, refund_amount, reason]
        );

        // 2. Put stock back into inventory
        await connection.execute(
            'UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?',
            [qty, product_id]
        );

        await connection.commit();
        res.status(201).json({ message: 'Return processed and stock updated' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Error processing return' });
    } finally {
        connection.release();
    }
});

module.exports = router;