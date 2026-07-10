const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find User
    const [users] = await db.execute('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account.' });
    }
    const user = users[0];

    // 2. Check Password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // 3. Fetch User's Permissions based on Role
    const [perms] = await db.execute(`
      SELECT p.name FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `, [user.role_id]);
    
    const permissions = perms.map(p => p.name);

    // 4. Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        roleId: user.role_id,
        permissions: permissions 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, permissions }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;