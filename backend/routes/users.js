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

// ✅ Get all baristas
router.get('/baristas', authenticateToken, async (req, res) => {
  try {
    // Optional: ensure only manager can view
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [rows] = await db.query(
      `SELECT id, username, role, created_at, last_login
       FROM users 
       WHERE role = 'barista'
       ORDER BY created_at DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching baristas:', error);
    res.status(500).json({ error: 'Server error fetching baristas' });
  }
});

// ✅ Create new barista
router.post('/baristas', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username exists
    const [existing] = await db.query(
      `SELECT id FROM users WHERE username = ?`,
      [username]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password and insert
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (username, password, role, created_at) 
       VALUES (?, ?, 'barista', NOW())`,
      [username, hashedPassword]
    );

    res.status(201).json({ message: 'Barista account created successfully' });
  } catch (error) {
    console.error('Error creating barista:', error);
    res.status(500).json({ error: 'Server error creating barista' });
  }
});

// ✅ Manager updates barista password
router.put('/baristas/:id/password', authenticateToken, async (req, res) => {
  try {
    // Only managers can update others' passwords
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({ error: 'New password must be at least 12 characters long' });
    }

    // Ensure the user exists and is a barista
    const [rows] = await db.query(`SELECT id, role FROM users WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (rows[0].role !== 'barista') {
      return res.status(400).json({ error: 'Can only update barista passwords' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE users 
       SET password = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [hashedPassword, id]
    );

    res.json({ message: 'Barista password updated successfully' });
  } catch (error) {
    console.error('Error updating barista password:', error);
    res.status(500).json({ error: 'Server error updating password' });
  }
});

// ✅ Delete barista
router.delete('/baristas/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;

    // Prevent deleting manager accounts
    const [rows] = await db.query(`SELECT role FROM users WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (rows[0].role === 'manager') {
      return res.status(400).json({ error: 'Cannot delete a manager account' });
    }

    await db.query(`DELETE FROM users WHERE id = ?`, [id]);
    res.json({ message: 'Barista account deleted successfully' });
  } catch (error) {
    console.error('Error deleting barista:', error);
    res.status(500).json({ error: 'Server error deleting barista' });
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

// ✅ Update username
router.put('/:id/username', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const { username } = req.body;
    const tokenUserId = req.user.userId || req.user.id;

    if (tokenUserId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    // Check if username is already taken
    const [existing] = await db.query(`SELECT id FROM users WHERE username = ? AND id != ?`, [username, userId]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    // Update username
    await db.query(
      `UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [username, userId]
    );

    res.json({ message: 'Username updated successfully' });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: 'Server error updating username' });
  }
});

module.exports = router;