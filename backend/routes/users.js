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

// Get total baristas (exclude soft-deleted)
router.get('/baristas/count', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as total FROM users WHERE role = 'barista' AND is_deleted = 0`
    );

    res.json({ total: rows[0].total });
  } catch (error) {
    console.error('Error fetching barista count:', error);
    res.status(500).json({ error: 'Server error fetching barista count' });
  }
});

// Get all baristas (exclude soft-deleted)
router.get('/baristas', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [rows] = await db.query(
      `SELECT id, username, role, created_at, last_login
       FROM users 
       WHERE role = 'barista' AND is_deleted = 0
       ORDER BY created_at DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching baristas:', error);
    res.status(500).json({ error: 'Server error fetching baristas' });
  }
});

// Get archived baristas (manager only)
router.get('/baristas/archived', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [rows] = await db.query(
      `SELECT 
        id, 
        username, 
        role, 
        created_at, 
        deleted_at,
        DATEDIFF(DATE_ADD(deleted_at, INTERVAL 30 DAY), NOW()) as days_until_deletion
       FROM users 
       WHERE role = 'barista' AND is_deleted = 1
       ORDER BY deleted_at DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching archived baristas:', error);
    res.status(500).json({ error: 'Server error fetching archived baristas' });
  }
});

// Create new barista
router.post('/baristas', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username exists (including soft-deleted)
    const [existing] = await db.query(
      `SELECT id, is_deleted FROM users WHERE username = ?`,
      [username]
    );

    if (existing.length > 0) {
      if (existing[0].is_deleted === 1) {
        return res.status(409).json({ error: 'Username exists in archive. Please restore or use a different username' });
      }
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

// Manager updates barista password
router.put('/baristas/:id/password', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({ error: 'New password must be at least 12 characters long' });
    }

    // Ensure the user exists and is a barista and not deleted
    const [rows] = await db.query(`SELECT id, role FROM users WHERE id = ? AND is_deleted = 0`, [id]);
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

// Soft delete barista (manager only) - Archive
router.delete('/baristas/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await connection.beginTransaction();

    const { id } = req.params;

    // Prevent deleting manager accounts and check if not already deleted
    const [rows] = await connection.query(`SELECT username, role FROM users WHERE id = ? AND is_deleted = 0`, [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    if (rows[0].role === 'manager') {
      await connection.rollback();
      return res.status(400).json({ error: 'Cannot delete a manager account' });
    }

    const username = rows[0].username;

    // Log transaction
    await connection.query(`
      INSERT INTO transactions (user_id, transaction_type, notes)
      VALUES (?, 'delete', ?)
    `, [id, `User "${username}" archived`]);

    // Soft delete
    await connection.query(`
      UPDATE users 
      SET is_deleted = 1, deleted_at = NOW() 
      WHERE id = ?
    `, [id]);

    await connection.commit();
    res.json({ message: 'Barista account archived successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error archiving barista:', error);
    res.status(500).json({ error: 'Server error archiving barista' });
  } finally {
    connection.release();
  }
});

// Restore archived barista (manager only)
router.post('/baristas/:id/restore', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await connection.beginTransaction();

    const { id } = req.params;

    const [rows] = await connection.query(`SELECT username FROM users WHERE id = ? AND is_deleted = 1`, [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Archived user not found' });
    }

    const username = rows[0].username;

    // Restore user
    await connection.query(`
      UPDATE users 
      SET is_deleted = 0, deleted_at = NULL 
      WHERE id = ?
    `, [id]);

    // Log transaction
    await connection.query(`
      INSERT INTO transactions (user_id, transaction_type, notes)
      VALUES (?, 'restock', ?)
    `, [id, `User "${username}" restored from archive`]);

    await connection.commit();
    res.json({ message: 'Barista account restored successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error restoring barista:', error);
    res.status(500).json({ error: 'Server error restoring barista' });
  } finally {
    connection.release();
  }
});

// Permanently delete archived barista (manager only)
router.delete('/baristas/:id/permanent', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await connection.beginTransaction();

    const { id } = req.params;

    const [rows] = await connection.query(`SELECT username FROM users WHERE id = ? AND is_deleted = 1`, [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Archived user not found' });
    }

    const username = rows[0].username;

    // Log transaction
    await connection.query(`
      INSERT INTO transactions (user_id, transaction_type, notes)
      VALUES (?, 'delete', ?)
    `, [id, `User "${username}" permanently deleted from archive`]);

    // Permanently delete
    await connection.query(`DELETE FROM users WHERE id = ?`, [id]);

    await connection.commit();
    res.json({ message: 'Barista account permanently deleted' });
  } catch (error) {
    await connection.rollback();
    console.error('Error permanently deleting barista:', error);
    res.status(500).json({ error: 'Server error permanently deleting barista' });
  } finally {
    connection.release();
  }
});

// Auto-cleanup archived users older than 30 days (cron job endpoint)
router.post('/cleanup-archived', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await connection.beginTransaction();

    const [usersToDelete] = await connection.query(`
      SELECT id, username
      FROM users 
      WHERE is_deleted = 1 
      AND deleted_at <= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    for (const user of usersToDelete) {
      await connection.query(`
        INSERT INTO transactions (user_id, transaction_type, notes)
        VALUES (?, 'delete', ?)
      `, [user.id, `User "${user.username}" auto-deleted after 30 days in archive`]);

      await connection.query(`DELETE FROM users WHERE id = ?`, [user.id]);
    }

    await connection.commit();
    res.json({ 
      message: 'Cleanup completed',
      users_deleted: usersToDelete.length
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error cleaning up archived users:', error);
    res.status(500).json({ error: 'Server error cleaning up users' });
  } finally {
    connection.release();
  }
});

// Get user profile by ID (exclude soft-deleted)
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
       WHERE id = ? AND is_deleted = 0`,
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

// Update user password
router.put('/:id/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;
    
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
      `SELECT password FROM users WHERE id = ? AND is_deleted = 0`,
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

// Update username
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

    // Check if username is already taken (exclude soft-deleted and current user)
    const [existing] = await db.query(
      `SELECT id FROM users WHERE username = ? AND id != ? AND is_deleted = 0`, 
      [username, userId]
    );
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