// routes/ordering.js

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
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      await connection.release();
      return res.status(403).json({ error: 'Access denied. Manager only.' });
    }

    await connection.beginTransaction();

    const { id } = req.params;

    // Check if item exists and is not deleted
    const [items] = await connection.query(
      `SELECT id, item_name, ordered FROM items WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (items.length === 0) {
      await connection.rollback();
      await connection.release();
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];

    if (item.ordered === 1) {
      await connection.rollback();
      await connection.release();
      return res.status(400).json({ error: 'Item is already marked as ordered' });
    }

    // Update ordered status
    await connection.query(
      `UPDATE items SET ordered = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    // Log transaction
    const userId = req.user.userId || req.user.id;
    await connection.query(
      `INSERT INTO transactions (user_id, item_id, transaction_type, notes, created_at)
       VALUES (?, ?, 'update', ?, NOW())`,
      [userId, id, `Marked "${item.item_name}" as ordered`]
    );

    await connection.commit();

    // Fetch updated item
    const [updatedItem] = await connection.query(
      `SELECT * FROM items WHERE id = ?`,
      [id]
    );

    await connection.release();

    res.json({
      message: 'Item marked as ordered successfully',
      item: updatedItem[0]
    });
  } catch (error) {
    await connection.rollback();
    await connection.release();
    console.error('Error marking item as ordered:', error);
    res.status(500).json({ 
      error: 'Server error marking item as ordered',
      details: error.message 
    });
  }
});

// Restock item and mark as not ordered
router.post('/:id/restock', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      await connection.release();
      return res.status(403).json({ error: 'Access denied. Manager only.' });
    }

    await connection.beginTransaction();

    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      await connection.rollback();
      await connection.release();
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // Check if item exists
    const [items] = await connection.query(
      `SELECT i.*, u.unit_name 
       FROM items i
       LEFT JOIN units u ON i.unit_id = u.id
       WHERE i.id = ? AND i.is_deleted = 0`,
      [id]
    );

    if (items.length === 0) {
      await connection.rollback();
      await connection.release();
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];

    // Calculate new stock
    const newStock = parseFloat(item.current_stock) + parseFloat(quantity);

    // Update stock and reset ordered flag
    await connection.query(
      `UPDATE items 
       SET current_stock = ?, ordered = 0, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newStock, id]
    );

    // Log transaction
    const userId = req.user.userId || req.user.id;
    await connection.query(
      `INSERT INTO transactions (user_id, item_id, transaction_type, quantity, unit_id, notes, created_at)
       VALUES (?, ?, 'restock', ?, ?, ?, NOW())`,
      [userId, id, quantity, item.unit_id, `Restocked ${quantity} ${item.unit_name}(s) of "${item.item_name}"`]
    );

    await connection.commit();

    // Fetch updated item with status
    const [updatedItem] = await connection.query(
      `SELECT *,
        CASE
          WHEN current_stock = 0 THEN 'out'
          WHEN current_stock <= minimum_stock THEN 'low'
          WHEN current_stock <= (minimum_stock * 1.5) THEN 'medium'
          ELSE 'healthy'
        END as status
       FROM items WHERE id = ?`,
      [id]
    );

    await connection.release();

    res.json({
      message: `Successfully restocked ${quantity} ${item.unit_name}(s)`,
      item: updatedItem[0]
    });
  } catch (error) {
    await connection.rollback();
    await connection.release();
    console.error('Error restocking item:', error);
    res.status(500).json({ 
      error: 'Server error restocking item',
      details: error.message 
    });
  }
});

module.exports = router;