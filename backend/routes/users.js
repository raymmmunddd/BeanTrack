// routes/users.js

const express = require('express');
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ✅ Get total baristas
router.get('/baristas/count', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as total FROM users WHERE role = 'barista'`
    );

    res.json({ total: rows[0].total });
  } catch (error) {
    console.error('Error fetching barista count:', error);
    res.status(500).json({ error: 'Server error fetching barista count' });
  }
});

// ✅ Get user profile by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Verify user is accessing their own profile or is a manager
    if (req.user.id !== parseInt(userId) && req.user.role !== 'manager') {
      return res.status(403).json({ 
        error: 'Access denied'
      });
    }

    const [rows] = await db.query(
      `SELECT id, username, role, created_at, updated_at 
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
});

// ✅ Update user password
router.put('/:id/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;
    
    // Check both userId and id in the token
    const tokenUserId = req.user.userId || req.user.id;

    // Verify user is updating their own password
    if (tokenUserId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'New password must be at least 12 characters long' });
    }

    // Get current user password
    const [rows] = await db.query(
      `SELECT password FROM users WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and updated_at timestamp
    await db.query(
      `UPDATE users 
       SET password = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [hashedPassword, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Server error updating password' });
  }
});

module.exports = router;