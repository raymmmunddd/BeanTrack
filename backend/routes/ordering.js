// routes/ordering.js - PostgreSQL Compatible - FIXED BOOLEAN COMPARISONS

const express = require('express');
const db = require('../config/database');
const jwt = require('jsonwebtoken');

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

// Mark item as ordered
router.patch('/:id/order', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    if (req.user.role !== 'manager') {
      client.release();
      return res.status(403).json({ error: 'Access denied. Manager only.' });
    }

    await client.query('BEGIN');

    const { id } = req.params;

    // Check if item exists and is not deleted
    const items = await client.query(
      `SELECT id, item_name, ordered FROM items WHERE id = $1 AND is_deleted = 0`,
      [id]
    );

    if (items.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items.rows[0];

    if (item.ordered === 1 || item.ordered === true) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'Item is already marked as ordered' });
    }

    // Update ordered status
    await client.query(
      `UPDATE items SET ordered = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    // Log transaction
    const userId = req.user.userId || req.user.id;
    await client.query(
      `INSERT INTO transactions (user_id, item_id, transaction_type, notes, created_at)
       VALUES ($1, $2, 'update', $3, CURRENT_TIMESTAMP)`,
      [userId, id, `Marked "${item.item_name}" as ordered`]
    );

    await client.query('COMMIT');

    // Fetch updated item
    const updatedItem = await client.query(
      `SELECT * FROM items WHERE id = $1`,
      [id]
    );

    client.release();

    res.json({
      message: 'Item marked as ordered successfully',
      item: updatedItem.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Error marking item as ordered:', error);
    res.status(500).json({ 
      error: 'Server error marking item as ordered',
      details: error.message 
    });
  }
});

// Restock item and mark as not ordered
router.put('/:id/restock', authenticateToken, async (req, res) => {
  const client = await db.connect();

  try {
    if (req.user.role !== 'manager') {
      client.release();
      return res.status(403).json({ error: 'Access denied. Manager only.' });
    }

    await client.query('BEGIN');

    const { id } = req.params;
    const { current_stock } = req.body;

    if (current_stock === undefined) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'Current stock value is required' });
    }

    // Get existing item
    const items = await client.query(
      `SELECT id, item_name, current_stock FROM items WHERE id = $1 AND is_deleted = 0`,
      [id]
    );

    if (items.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Item not found' });
    }

    const oldItem = items.rows[0];

    // ✅ Make sure to convert to numbers before adding
    const addedStock = parseFloat(current_stock);
    const newStock = parseFloat(oldItem.current_stock) + addedStock;

    // ✅ Update stock and mark as not ordered
    await client.query(
      `UPDATE items 
       SET current_stock = $1, ordered = 0, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND is_deleted = 0`,
      [newStock, id]
    );

    // ✅ Log transaction
    const userId = req.user.userId || req.user.id;
    await client.query(
      `INSERT INTO transactions (user_id, item_id, transaction_type, quantity, notes, created_at)
       VALUES ($1, $2, 'restock', $3, $4, CURRENT_TIMESTAMP)`,
      [
        userId,
        id,
        addedStock, // log the *amount* added
        `Item restocked. Old stock: ${oldItem.current_stock}, Added: ${addedStock}, New stock: ${newStock}`
      ]
    );

    await client.query('COMMIT');

    const updatedItem = await client.query(`SELECT * FROM items WHERE id = $1`, [id]);

    client.release();

    res.json({
      message: 'Item restocked successfully',
      item: updatedItem.rows[0],
    });

  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Error during restock:', error);
    res.status(500).json({
      error: 'Server error during restock',
      details: error.message,
    });
  }
});

module.exports = router;
