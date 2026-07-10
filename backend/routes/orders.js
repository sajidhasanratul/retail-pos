const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const checkPerm = require('../middleware/checkPermission');

router.use(auth);

// GET /api/orders/search-products (For the POS autocomplete)
router.get('/search-products', checkPerm('sales.create'), async (req, res) => {
    try {
        const query = req.query.q || '';
        const [products] = await db.query(
            `SELECT id, name, sku, barcode, selling_price, stock_qty 
             FROM products 
             WHERE (name LIKE ? OR sku LIKE ? OR barcode LIKE ?) AND stock_qty > 0 LIMIT 20`,
            [`%${query}%`, `%${query}%`, `%${query}%`]
        );
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error searching products' });
    }
});

// POST /api/orders - Process a new sale
router.post('/', checkPerm('sales.create'), async (req, res) => {
    const { customer_id, cart, subtotal, discount, tax, grand_total, payment_method, amount_paid } = req.body;
    const user_id = req.userData.userId;
    
    if (!cart || cart.length === 0) return res.status(400).json({ message: 'Cart is empty' });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Generate Invoice ID (INV-YYYYMMDD-XXXX)
        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const [lastOrder] = await connection.query('SELECT id FROM orders ORDER BY id DESC LIMIT 1');
        const nextId = lastOrder.length ? lastOrder[0].id + 1 : 1;
        const invoice_id = `INV-${dateStr}-${String(nextId).padStart(4, '0')}`;

        // 2. Insert Order
        const [orderResult] = await connection.execute(
            `INSERT INTO orders (invoice_id, customer_id, user_id, subtotal, discount_amount, tax_amount, grand_total) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [invoice_id, customer_id || null, user_id, subtotal, discount, tax, grand_total]
        );
        const orderId = orderResult.insertId;

        // 3. Insert Order Items & Deduct Stock
        for (const item of cart) {
            // Insert item
            await connection.execute(
                `INSERT INTO order_items (order_id, product_id, qty, unit_price, line_total) VALUES (?, ?, ?, ?, ?)`,
                [orderId, item.id, item.qty, item.price, item.qty * item.price]
            );
            
            // Deduct stock
            const [stockResult] = await connection.execute(
                `UPDATE products SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?`,
                [item.qty, item.id, item.qty]
            );
            
            if (stockResult.affectedRows === 0) {
                throw new Error(`Insufficient stock for product: ${item.name}`);
            }
        }

        // 4. Insert Payment Record
        await connection.execute(
            `INSERT INTO payments (order_id, method, amount) VALUES (?, ?, ?)`,
            [orderId, payment_method, amount_paid]
        );

        await connection.commit();
        res.status(201).json({ message: 'Sale completed successfully', invoice_id });

    } catch (error) {
        await connection.rollback();
        console.error('Checkout Error:', error);
        res.status(400).json({ message: error.message || 'Error processing sale' });
    } finally {
        connection.release();
    }
});

router.get('/', checkPerm('sales.view'), async (req, res) => {
    try {
        const [orders] = await db.query('SELECT * FROM orders ORDER BY id DESC LIMIT 50');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

module.exports = router;