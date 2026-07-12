const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const config = require('./config');

const app = express();
const PORT = config.port;

app.use(cors());
app.use(express.json());

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));

// ── MySQL Connection Pool ─────────────────────────
let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool(config.db);
  }
  return pool;
};

// Helper query executor
const dbQuery = async (sql, params = []) => {
  const connectionPool = getPool();
  const [rows] = await connectionPool.execute(sql, params);
  return rows;
};

// ── Database Setup & Seeding ──────────────────────
const initDB = async () => {
  console.log('Connecting to MySQL and ensuring database exists...');
  
  // Connect without database selected first, to ensure database exists
  try {
    const tempConn = await mysql.createConnection({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      port: config.db.port
    });
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\``);
    await tempConn.end();
  } catch (err) {
    console.warn(`Warning: Could not auto-create database (${err.message}). Proceeding assuming it exists.`);
  }

  console.log(`Database "${config.db.database}" ready. Creating tables...`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    categoryId VARCHAR(50),
    costPrice DECIMAL(10,2) DEFAULT 0.00,
    sellingPrice DECIMAL(10,2) DEFAULT 0.00,
    stock INT DEFAULT 0,
    alertQty INT DEFAULT 5,
    image LONGTEXT
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS variations (
    id VARCHAR(50) PRIMARY KEY,
    productId VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    price DECIMAL(10,2) DEFAULT 0.00,
    costPrice DECIMAL(10,2) DEFAULT 0.00,
    stock INT DEFAULT 0
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    label VARCHAR(50),
    customDiscount DECIMAL(5,2) DEFAULT 0.00,
    address TEXT
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    invoiceId VARCHAR(50) UNIQUE NOT NULL,
    customerId VARCHAR(50),
    customerName VARCHAR(255),
    customerPhone VARCHAR(50),
    date DATETIME NOT NULL,
    subtotal DECIMAL(12,2) DEFAULT 0.00,
    discountType VARCHAR(50),
    discountValue DECIMAL(10,2) DEFAULT 0.00,
    discountAmount DECIMAL(10,2) DEFAULT 0.00,
    taxPercent DECIMAL(5,2) DEFAULT 0.00,
    taxAmount DECIMAL(10,2) DEFAULT 0.00,
    grandTotal DECIMAL(12,2) DEFAULT 0.00,
    paidAmount DECIMAL(12,2) DEFAULT 0.00,
    dueAmount DECIMAL(12,2) DEFAULT 0.00,
    returnedAmount DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'completed'
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS orderItems (
    id VARCHAR(50) PRIMARY KEY,
    orderId VARCHAR(50),
    productId VARCHAR(50),
    productName VARCHAR(255),
    variationName VARCHAR(100),
    qty INT NOT NULL,
    unitPrice DECIMAL(10,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS returns (
    id VARCHAR(50) PRIMARY KEY,
    returnId VARCHAR(50) UNIQUE NOT NULL,
    orderId VARCHAR(50),
    invoiceId VARCHAR(50),
    customerName VARCHAR(255),
    customerPhone VARCHAR(50),
    date DATETIME NOT NULL,
    returnTotal DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'completed'
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS returnItems (
    id VARCHAR(50) PRIMARY KEY,
    returnId VARCHAR(50),
    orderId VARCHAR(50),
    productId VARCHAR(50),
    productName VARCHAR(255),
    variationName VARCHAR(100),
    qty INT NOT NULL,
    unitPrice DECIMAL(10,2) NOT NULL,
    returnAmount DECIMAL(12,2) NOT NULL
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    orderId VARCHAR(50),
    method VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS counters (
    key_name VARCHAR(50) PRIMARY KEY,
    val INT DEFAULT 0
  )`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL
  )`);

  // Seeding Counters
  const counters = await dbQuery(`SELECT * FROM counters`);
  if (counters.length === 0) {
    await dbQuery(`INSERT INTO counters (key_name, val) VALUES ('invoice', 0)`);
    await dbQuery(`INSERT INTO counters (key_name, val) VALUES ('return', 0)`);
  }

  // Seeding Users
  const users = await dbQuery(`SELECT * FROM users`);
  if (users.length === 0) {
    console.log('Seeding default users...');
    await dbQuery(`INSERT INTO users (id, username, password, name, role) VALUES 
      ('u-admin', 'admin', 'admin', 'System Admin', 'admin'),
      ('u-mgr', 'manager', 'manager', 'Store Manager', 'manager'),
      ('u-cash', 'cashier', 'cashier', 'Senior Cashier', 'cashier')`);
  }

  // Seeding Catalog if empty
  const prods = await dbQuery(`SELECT count(*) as count FROM products`);
  if (prods[0].count === 0) {
    await seedCatalog();
  }
};

const seedCatalog = async () => {
  console.log('Seeding initial products catalog...');
  
  const cats = [
    ['cat-1', 'Clothing'],
    ['cat-2', 'Electronics'],
    ['cat-3', 'Food & Beverages'],
    ['cat-4', 'Accessories'],
    ['cat-5', 'Home & Living'],
    ['cat-6', 'Beauty & Health']
  ];
  for (const c of cats) {
    await dbQuery(`INSERT INTO categories (id, name) VALUES (?, ?)`, c);
  }

  // Add sample product
  await dbQuery(`INSERT INTO products (id, name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty) VALUES 
    ('p1', 'Classic T-Shirt', 'TSH-001', '8901234567890', 'cat-1', 200.00, 350.00, 120, 10),
    ('p2', 'Denim Jeans', 'JNS-001', '8901234568001', 'cat-1', 800.00, 1500.00, 60, 5),
    ('p3', 'Wireless Earbuds', 'EAR-001', '8901234569001', 'cat-2', 600.00, 1200.00, 40, 5)`);

  await dbQuery(`INSERT INTO variations (id, productId, name, sku, barcode, price, costPrice, stock) VALUES 
    ('v1a', 'p1', 'S - White', 'TSH-001-SW', '8901234567891', 350.00, 200.00, 30),
    ('v1b', 'p1', 'M - White', 'TSH-001-MW', '8901234567892', 350.00, 200.00, 30),
    ('v2a', 'p2', '30 - Blue', 'JNS-30B', '8901234568002', 1500.00, 800.00, 20),
    ('v2b', 'p2', '32 - Blue', 'JNS-32B', '8901234568003', 1500.00, 800.00, 20)`);

  await dbQuery(`INSERT INTO customers (id, name, phone, email, label, customDiscount, address) VALUES 
    ('cust-1', 'Rahim Ahmed', '01712345678', 'rahim@email.com', 'VIP', 5.00, 'Dhaka, Bangladesh'),
    ('cust-2', 'Fatima Begum', '01898765432', 'fatima@email.com', 'Elite', 10.00, 'Chittagong, Bangladesh')`);

  console.log('Seeding finished.');
};

initDB().catch(console.error);

// ── Authentication Middleware ────────────────────
// For this standalone setup, we will pass active user object as header 'x-user-role' and 'x-user-name' for validation
const verifyRole = (roles) => {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    if (!userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Permission denied for this task' });
    }
    next();
  };
};

// ── Auth Endpoints ──────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const rows = await dbQuery(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    const user = rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/change-password', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing old or new password keys' });
    }

    const rows = await dbQuery(`SELECT * FROM users WHERE id = ? AND password = ?`, [userId, oldPassword]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Incorrect old password' });
    }

    await dbQuery(`UPDATE users SET password = ? WHERE id = ?`, [newPassword, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users Management (Admin Only)
app.get('/api/users', verifyRole(['admin']), async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT id, username, name, role FROM users ORDER BY name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', verifyRole(['admin']), async (req, res) => {
  try {
    const { id, username, password, name, role } = req.body;
    await dbQuery(`INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)`,
      [id, username, password, name, role]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', verifyRole(['admin']), async (req, res) => {
  try {
    const uid = req.params.id;
    const { username, password, name, role } = req.body;
    if (password) {
      await dbQuery(`UPDATE users SET username = ?, password = ?, name = ?, role = ? WHERE id = ?`,
        [username, password, name, role, uid]);
    } else {
      await dbQuery(`UPDATE users SET username = ?, name = ?, role = ? WHERE id = ?`,
        [username, name, role, uid]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', verifyRole(['admin']), async (req, res) => {
  try {
    const uid = req.params.id;
    if (uid === 'u-admin') {
      return res.status(400).json({ error: 'Cannot delete primary admin account' });
    }
    await dbQuery(`DELETE FROM users WHERE id = ?`, [uid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generic API Endpoints ───────────────────────

// Counters
app.get('/api/counters/next/:prefix', async (req, res) => {
  try {
    const prefix = req.params.prefix.toUpperCase();
    const key = prefix === 'INV-' ? 'invoice' : 'return';
    const rows = await dbQuery(`SELECT val FROM counters WHERE key_name = ?`, [key]);
    const nextVal = (rows.length > 0 ? rows[0].val : 0) + 1;
    res.json({ nextId: prefix + String(nextVal).padStart(4, '0') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT * FROM categories ORDER BY name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, name } = req.body;
    await dbQuery(`INSERT INTO categories (id, name) VALUES (?, ?)`, [id, name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const prods = await dbQuery(`SELECT * FROM products`);
    const vars = await dbQuery(`SELECT * FROM variations`);

    const result = prods.map(p => {
      p.variations = vars.filter(v => v.productId === p.id);
      return p;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image, variations } = req.body;
    await dbQuery(`INSERT INTO products (id, name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image]);

    if (variations && variations.length > 0) {
      for (const v of variations) {
        await dbQuery(`INSERT INTO variations (id, productId, name, sku, barcode, price, costPrice, stock) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [v.id, id, v.name, v.sku, v.barcode, v.price, v.costPrice, v.stock]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const pid = req.params.id;
    const { name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image, variations } = req.body;

    await dbQuery(`UPDATE products SET name = ?, sku = ?, barcode = ?, categoryId = ?, costPrice = ?, 
      sellingPrice = ?, stock = ?, alertQty = ?, image = ? WHERE id = ?`,
      [name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image, pid]);

    await dbQuery(`DELETE FROM variations WHERE productId = ?`, [pid]);
    if (variations && variations.length > 0) {
      for (const v of variations) {
        await dbQuery(`INSERT INTO variations (id, productId, name, sku, barcode, price, costPrice, stock) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [v.id, pid, v.name, v.sku, v.barcode, v.price, v.costPrice, v.stock]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const pid = req.params.id;
    await dbQuery(`DELETE FROM products WHERE id = ?`, [pid]);
    await dbQuery(`DELETE FROM variations WHERE productId = ?`, [pid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customers
app.get('/api/customers', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT * FROM customers ORDER BY name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, name, phone, email, label, customDiscount, address } = req.body;
    await dbQuery(`INSERT INTO customers (id, name, phone, email, label, customDiscount, address) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, name, phone, email, label, customDiscount, address]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const cid = req.params.id;
    const { name, phone, email, label, customDiscount, address } = req.body;
    await dbQuery(`UPDATE customers SET name = ?, phone = ?, email = ?, label = ?, 
      customDiscount = ?, address = ? WHERE id = ?`, [name, phone, email, label, customDiscount, address, cid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', verifyRole(['admin', 'manager']), async (req, res) => {
  try {
    const cid = req.params.id;
    await dbQuery(`DELETE FROM customers WHERE id = ?`, [cid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders
app.get('/api/orders', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT * FROM orders ORDER BY date DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orderItems', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT * FROM orderItems`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payments', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT * FROM payments`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const { order, items, payments } = req.body;

    // Convert date string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
    const formattedDate = new Date(order.date).toISOString().slice(0, 19).replace('T', ' ');

    await connection.execute(`INSERT INTO orders (
      id, invoiceId, customerId, customerName, customerPhone, date, subtotal, discountType, 
      discountValue, discountAmount, taxPercent, taxAmount, grandTotal, paidAmount, dueAmount, returnedAmount, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order.id, order.invoiceId, order.customerId, order.customerName, order.customerPhone, formattedDate, order.subtotal,
      order.discountType, order.discountValue, order.discountAmount, order.taxPercent, order.taxAmount, order.grandTotal,
      order.paidAmount, order.dueAmount, order.returnedAmount, order.status]);

    for (const item of items) {
      await connection.execute(`INSERT INTO orderItems (id, orderId, productId, productName, variationName, qty, unitPrice, total) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, order.id, item.productId, item.productName, item.variationName, item.qty, item.unitPrice, item.total]);

      if (item.variationName) {
        await connection.execute(`UPDATE variations SET stock = stock - ? WHERE productId = ? AND name = ?`,
          [item.qty, item.productId, item.variationName]);
      }
      await connection.execute(`UPDATE products SET stock = stock - ? WHERE id = ?`, [item.qty, item.productId]);
    }

    for (const p of payments) {
      await connection.execute(`INSERT INTO payments (id, orderId, method, amount) VALUES (?, ?, ?, ?)`,
        [p.id, order.id, p.method, p.amount]);
    }

    await connection.execute(`UPDATE counters SET val = val + 1 WHERE key_name = 'invoice'`);

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Returns
app.get('/api/returns', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT * FROM returns ORDER BY date DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/returnItems', async (req, res) => {
  try {
    const rows = await dbQuery(`SELECT * FROM returnItems`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/returns', async (req, res) => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const { returnRecord, items } = req.body;
    const formattedDate = new Date(returnRecord.date).toISOString().slice(0, 19).replace('T', ' ');

    await connection.execute(`INSERT INTO returns (id, returnId, orderId, invoiceId, customerName, customerPhone, date, returnTotal, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [returnRecord.id, returnRecord.returnId, returnRecord.orderId, returnRecord.invoiceId, returnRecord.customerName,
      returnRecord.customerPhone, formattedDate, returnRecord.returnTotal, returnRecord.status]);

    for (const item of items) {
      await connection.execute(`INSERT INTO returnItems (id, returnId, orderId, productId, productName, variationName, qty, unitPrice, returnAmount) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, returnRecord.id, returnRecord.orderId, item.productId, item.productName, item.variationName, item.qty, item.unitPrice, item.returnAmount]);

      if (item.variationName) {
        await connection.execute(`UPDATE variations SET stock = stock + ? WHERE productId = ? AND name = ?`,
          [item.qty, item.productId, item.variationName]);
      }
      await connection.execute(`UPDATE products SET stock = stock + ? WHERE id = ?`, [item.qty, item.productId]);
    }

    await connection.execute(`UPDATE orders SET returnedAmount = returnedAmount + ? WHERE id = ?`,
      [returnRecord.returnTotal, returnRecord.orderId]);

    await connection.execute(`UPDATE counters SET val = val + 1 WHERE key_name = 'return'`);

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Backup
app.get('/api/backup/export', verifyRole(['admin']), async (req, res) => {
  try {
    const categories = await dbQuery(`SELECT * FROM categories`);
    const products = await dbQuery(`SELECT * FROM products`);
    const variations = await dbQuery(`SELECT * FROM variations`);
    const customers = await dbQuery(`SELECT * FROM customers`);
    const orders = await dbQuery(`SELECT * FROM orders`);
    const orderItems = await dbQuery(`SELECT * FROM orderItems`);
    const returns = await dbQuery(`SELECT * FROM returns`);
    const returnItems = await dbQuery(`SELECT * FROM returnItems`);
    const payments = await dbQuery(`SELECT * FROM payments`);
    const counters = await dbQuery(`SELECT * FROM counters`);
    const users = await dbQuery(`SELECT id, username, name, role FROM users`);

    res.json({
      categories,
      products,
      variations,
      customers,
      orders,
      orderItems,
      returns,
      returnItems,
      payments,
      counters,
      users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/import', verifyRole(['admin']), async (req, res) => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const { categories, products, variations, customers, orders, orderItems, returns, returnItems, payments, counters, users } = req.body;

    await connection.execute(`DELETE FROM categories`);
    await connection.execute(`DELETE FROM products`);
    await connection.execute(`DELETE FROM variations`);
    await connection.execute(`DELETE FROM customers`);
    await connection.execute(`DELETE FROM orders`);
    await connection.execute(`DELETE FROM orderItems`);
    await connection.execute(`DELETE FROM returns`);
    await connection.execute(`DELETE FROM returnItems`);
    await connection.execute(`DELETE FROM payments`);
    await connection.execute(`DELETE FROM counters`);
    await connection.execute(`DELETE FROM users`);

    for (const c of categories || []) await connection.execute(`INSERT INTO categories (id, name) VALUES (?, ?)`, [c.id, c.name]);
    for (const p of products || []) {
      await connection.execute(`INSERT INTO products (id, name, sku, barcode, categoryId, costPrice, sellingPrice, stock, alertQty, image) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [p.id, p.name, p.sku, p.barcode, p.categoryId, p.costPrice, p.sellingPrice, p.stock, p.alertQty, p.image || null]);
    }
    for (const v of variations || []) {
      await connection.execute(`INSERT INTO variations (id, productId, name, sku, barcode, price, costPrice, stock) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [v.id, v.productId, v.name, v.sku, v.barcode, v.price, v.costPrice, v.stock]);
    }
    for (const c of customers || []) {
      await connection.execute(`INSERT INTO customers (id, name, phone, email, label, customDiscount, address) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [c.id, c.name, c.phone, c.email, c.label, c.customDiscount, c.address]);
    }
    for (const o of orders || []) {
      const formattedDate = new Date(o.date).toISOString().slice(0, 19).replace('T', ' ');
      await connection.execute(`INSERT INTO orders (id, invoiceId, customerId, customerName, customerPhone, date, subtotal, discountType, discountValue, discountAmount, taxPercent, taxAmount, grandTotal, paidAmount, dueAmount, returnedAmount, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [o.id, o.invoiceId, o.customerId, o.customerName, o.customerPhone, formattedDate, o.subtotal, o.discountType, o.discountValue, o.discountAmount, o.taxPercent, o.taxAmount, o.grandTotal, o.paidAmount, o.dueAmount, o.returnedAmount, o.status]);
    }
    for (const i of orderItems || []) {
      await connection.execute(`INSERT INTO orderItems (id, orderId, productId, productName, variationName, qty, unitPrice, total) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [i.id, i.orderId, i.productId, i.productName, i.variationName, i.qty, i.unitPrice, i.total]);
    }
    for (const r of returns || []) {
      const formattedDate = new Date(r.date).toISOString().slice(0, 19).replace('T', ' ');
      await connection.execute(`INSERT INTO returns (id, returnId, orderId, invoiceId, customerName, customerPhone, date, returnTotal, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [r.id, r.returnId, r.orderId, r.invoiceId, r.customerName, r.customerPhone, formattedDate, r.returnTotal, r.status]);
    }
    for (const i of returnItems || []) {
      await connection.execute(`INSERT INTO returnItems (id, returnId, orderId, productId, productName, variationName, qty, unitPrice, returnAmount) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [i.id, i.returnId, i.orderId, i.productId, i.productName, i.variationName, i.qty, i.unitPrice, i.returnAmount]);
    }
    for (const p of payments || []) {
      await connection.execute(`INSERT INTO payments (id, orderId, method, amount) VALUES (?, ?, ?, ?)`, [p.id, p.orderId, p.method, p.amount]);
    }
    for (const c of counters || []) {
      await connection.execute(`INSERT INTO counters (key_name, val) VALUES (?, ?)`, [c.key_name, c.val]);
    }
    for (const u of users || []) {
      // Default placeholder passwords if missing during backup import
      await connection.execute(`INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)`,
        [u.id, u.username, u.password || 'password123', u.name, u.role]);
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Listener
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
