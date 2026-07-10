const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const checkPerm = require('../middleware/checkPermission');

router.use(auth);

router.get('/summary', checkPerm('reports.view'), async (req, res) => {
    try {
        // Calculate Today's Sales
        const [todaySales] = await db.query(`
            SELECT COALESCE(SUM(grand_total), 0) as total 
            FROM orders 
            WHERE DATE(created_at) = CURDATE()
        `);
        
        // Calculate Total Products in Stock
        const [stock] = await db.query(`SELECT COALESCE(SUM(stock_qty), 0) as items FROM products`);

        res.json({
            today_sales: todaySales[0].total,
            total_items_in_stock: stock[0].items
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reports' });
    }
});

module.exports = router;