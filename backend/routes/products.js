const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const checkPerm = require('../middleware/checkPermission');

// All product routes require valid login
router.use(auth);

// GET /api/products - View all products
router.get('/', checkPerm('products.view'), async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
});

// POST /api/products - Create a product
router.post('/', checkPerm('products.create'), async (req, res) => {
    const { name, sku, cost_price, selling_price, stock_qty } = req.body;
    try {
        await db.execute(
            'INSERT INTO products (name, sku, cost_price, selling_price, stock_qty) VALUES (?, ?, ?, ?, ?)',
            [name, sku, cost_price, selling_price, stock_qty]
        );
        res.status(201).json({ message: 'Product created successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'SKU already exists' });
        res.status(500).json({ message: 'Error creating product' });
    }
});

// DELETE /api/products/:id - Delete a product
router.delete('/:id', checkPerm('products.delete'), async (req, res) => {
    try {
        await db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting product' });
    }
});

module.exports = router;