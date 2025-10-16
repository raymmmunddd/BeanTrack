// routes/users.js - PostgreSQL Compatible with INTEGER is_deleted

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
      console.error('JWT verification error:', err);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get total baristas (exclude soft-deleted)
router.get('/baristas/count', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) as total FROM users WHERE role = 'barista' AND (is_deleted = 0 OR is_deleted IS NULL)`
    );

    res.json({ total: parseInt(rows[0].total) });
  } catch (error) {
    console.error('Error fetching barista count:', error);
    console.error('Error message:', error.message);
    res.status(500).json({ error: 'Server error fetching barista count' });
  }
});

// Get all baristas (exclude soft-deleted)
router.get('/baristas', authenticateToken, async (req, res) => {
  try {
    console.log('=== Fetching Baristas ===');
    console.log('User from token:', JSON.stringify(req.user));
    console.log('User role:', req.user.role);

    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await db.query(
      `SELECT id, username, role, created_at, last_login
       FROM users 
       WHERE role = 'barista' AND (is_deleted = 0 OR is_deleted IS NULL)
       ORDER BY created_at DESC`
    );

    console.log(`Found ${rows.length} baristas`);
    res.json(rows);
  } catch (error) {
    console.error('=== Error Fetching Baristas ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Server error fetching baristas', 
      details: error.message 
    });
  }
});

// Get archived baristas (manager only)
router.get('/baristas/archived', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await db.query(
      `SELECT 
        id, 
        username, 
        role, 
        created_at, 
        deleted_at,
        EXTRACT(DAY FROM (deleted_at + INTERVAL '30 days' - NOW())) as days_until_deletion
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
    const { rows: existing } = await db.query(
      `SELECT id, is_deleted FROM users WHERE username = $1`,
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
      `INSERT INTO users (username, password, role, created_at, is_deleted) 
       VALUES ($1, $2, 'barista', NOW(), 0)`,
      [username, hashedPassword]
    );

    res.status(201).json({ message: 'Barista account created successfully' });
  } catch (error) {
    console.error('Error creating barista:', error);
    res.status(500).json({ error: 'Server error creating barista' });
  }
});

// Manager updates barista username
router.put('/baristas/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { username } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    // Ensure the user exists and is a barista and not deleted
    const { rows } = await db.query(
      `SELECT id, role FROM users WHERE id = $1 AND (is_deleted = 0 OR is_deleted IS NULL)`, 
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (rows[0].role !== 'barista') {
      return res.status(400).json({ error: 'Can only update barista accounts' });
    }

    // Check if username is already taken
    const { rows: existing } = await db.query(
      `SELECT id FROM users WHERE username = $1 AND id != $2 AND (is_deleted = 0 OR is_deleted IS NULL)`,
      [username, id]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    await db.query(
      `UPDATE users 
       SET username = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [username, id]
    );

    res.json({ message: 'Barista username updated successfully' });
  } catch (error) {
    console.error('Error updating barista username:', error);
    res.status(500).json({ error: 'Server error updating username' });
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
    const { rows } = await db.query(
      `SELECT id, role FROM users WHERE id = $1 AND (is_deleted = 0 OR is_deleted IS NULL)`, 
      [id]
    );
    
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
       SET password = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
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
  const client = await db.connect();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await client.query('BEGIN');

    const { id } = req.params;

    // Prevent deleting manager accounts and check if not already deleted
    const { rows } = await client.query(
      `SELECT username, role FROM users WHERE id = $1 AND (is_deleted = 0 OR is_deleted IS NULL)`, 
      [id]
    );
    
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    if (rows[0].role === 'manager') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot delete a manager account' });
    }

    const username = rows[0].username;

    // Log transaction
    await client.query(`
      INSERT INTO transactions (user_id, transaction_type, notes)
      VALUES ($1, $2, $3)
    `, [id, 'delete', `User "${username}" archived`]);

    // Soft delete
    await client.query(`
      UPDATE users 
      SET is_deleted = 1, deleted_at = NOW() 
      WHERE id = $1
    `, [id]);

    await client.query('COMMIT');
    res.json({ message: 'Barista account archived successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error archiving barista:', error);
    res.status(500).json({ error: 'Server error archiving barista' });
  } finally {
    client.release();
  }
});

// Restore archived barista (manager only)
router.post('/baristas/:id/restore', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await client.query('BEGIN');

    const { id } = req.params;

    const { rows } = await client.query(
      `SELECT username FROM users WHERE id = $1 AND is_deleted = 1`, 
      [id]
    );
    
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Archived user not found' });
    }

    const username = rows[0].username;

    // Restore user
    await client.query(`
      UPDATE users 
      SET is_deleted = 0, deleted_at = NULL 
      WHERE id = $1
    `, [id]);

    // Log transaction
    await client.query(`
      INSERT INTO transactions (user_id, transaction_type, notes)
      VALUES ($1, $2, $3)
    `, [id, 'restock', `User "${username}" restored from archive`]);

    await client.query('COMMIT');
    res.json({ message: 'Barista account restored successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error restoring barista:', error);
    res.status(500).json({ error: 'Server error restoring barista' });
  } finally {
    client.release();
  }
});

// Permanently delete archived barista (manager only)
router.delete('/baristas/:id/permanent', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await client.query('BEGIN');

    const { id } = req.params;

    const { rows } = await client.query(
      `SELECT username FROM users WHERE id = $1 AND is_deleted = 1`, 
      [id]
    );
    
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Archived user not found' });
    }

    const username = rows[0].username;

    // Log transaction
    await client.query(`
      INSERT INTO transactions (user_id, transaction_type, notes)
      VALUES ($1, $2, $3)
    `, [id, 'delete', `User "${username}" permanently deleted from archive`]);

    // Permanently delete
    await client.query(`DELETE FROM users WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.json({ message: 'Barista account permanently deleted' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error permanently deleting barista:', error);
    res.status(500).json({ error: 'Server error permanently deleting barista' });
  } finally {
    client.release();
  }
});

// Auto-cleanup archived users older than 30 days (cron job endpoint)
router.post('/cleanup-archived', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await client.query('BEGIN');

    const { rows: usersToDelete } = await client.query(`
      SELECT id, username
      FROM users 
      WHERE is_deleted = 1 
      AND deleted_at <= NOW() - INTERVAL '30 days'
    `);

    for (const user of usersToDelete) {
      await client.query(`
        INSERT INTO transactions (user_id, transaction_type, notes)
        VALUES ($1, $2, $3)
      `, [user.id, 'delete', `User "${user.username}" auto-deleted after 30 days in archive`]);

      await client.query(`DELETE FROM users WHERE id = $1`, [user.id]);
    }

    await client.query('COMMIT');
    res.json({ 
      message: 'Cleanup completed',
      users_deleted: usersToDelete.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cleaning up archived users:', error);
    res.status(500).json({ error: 'Server error cleaning up users' });
  } finally {
    client.release();
  }
});

// Get user profile by ID (exclude soft-deleted)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const tokenUserId = req.user.userId || req.user.id;

    console.log('=== Get User Profile ===');
    console.log('Requested userId:', userId);
    console.log('Token user:', JSON.stringify(req.user));
    console.log('Token userId:', tokenUserId);
    console.log('User role:', req.user.role);

    // Verify user is accessing their own profile or is a manager
    if (tokenUserId !== parseInt(userId) && req.user.role !== 'manager') {
      console.log('Access denied - user mismatch');
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await db.query(
      `SELECT id, username, role, created_at, updated_at 
       FROM users 
       WHERE id = $1 AND (is_deleted = 0 OR is_deleted IS NULL)`,
      [userId]
    );

    if (rows.length === 0) {
      console.log('User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User profile found:', rows[0].username);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    console.error('Error stack:', error.stack);
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
    const { rows } = await db.query(
      `SELECT password FROM users WHERE id = $1 AND (is_deleted = 0 OR is_deleted IS NULL)`,
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
       SET password = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
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
    const { rows: existing } = await db.query(
      `SELECT id FROM users WHERE username = $1 AND id != $2 AND (is_deleted = 0 OR is_deleted IS NULL)`, 
      [username, userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    // Update username
    await db.query(
      `UPDATE users SET username = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [username, userId]
    );

    res.json({ message: 'Username updated successfully' });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: 'Server error updating username' });
  }
});

module.exports = router;
