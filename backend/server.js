const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. Import all route modules together at the top
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles'); // Added this to match your structural architecture

const app = express();

// 2. Core Middleware Configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Mount All API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/customers', require('./routes/customers'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/returns', require('./routes/returns')); // Added to ensure returns log handles properly

// 4. Global Error Handling Middleware (MUST be dead last before listening)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

// 5. Initialize Server Boot Lifecycle Listener
const PORT = process.env.PORT || 5000; // Standardized to 5000 to match your deployment config
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); // Fixed console.lang typo
});