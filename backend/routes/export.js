const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/export?type=inventory|lowstock|history|team
router.get('/', async (req, res) => {
  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ message: 'Missing export type parameter' });
  }

  try {
    let query = '';
    let [rows] = [[]];

    switch (type) {
      // === INVENTORY EXPORT ===
    case 'inventory':
    query = `
        SELECT 
        i.id,
        i.item_name,
        c.name AS category_name,
        u.name AS unit_name,
        i.current_stock,
        i.minimum_stock,
        i.maximum_stock,
        CASE 
            WHEN i.current_stock = 0 THEN 'Out of Stock' 
            WHEN i.current_stock <= i.minimum_stock THEN 'Low Stock' 
            WHEN i.current_stock <= (i.minimum_stock + (i.maximum_stock - i.minimum_stock) * 0.5) THEN 'Medium' 
            ELSE 'Healthy'
        END AS stock_status
        FROM items i
        JOIN categories c ON i.category_id = c.id
        JOIN units u ON i.unit_id = u.id
    `;
    [rows] = await db.query(query);
    break;

      // === LOW STOCK EXPORT ===
      case 'lowstock':
        query = `
          SELECT 
            i.id,
            i.item_name,
            c.name AS category_name,
            u.name AS unit_name,
            i.current_stock,
            i.minimum_stock
          FROM items i
          JOIN categories c ON i.category_id = c.id
          JOIN units u ON i.unit_id = u.id
          WHERE i.current_stock <= i.minimum_stock
        `;
        [rows] = await db.query(query);
        break;

      // === TRANSACTION HISTORY EXPORT ===
      case 'history':
        query = `
          SELECT 
            t.id,
            t.transaction_type,
            t.quantity,
            t.notes,
            t.created_at,
            i.item_name,
            u.name AS unit_name,
            usr.username
          FROM transactions t
          JOIN items i ON t.item_id = i.id
          JOIN units u ON i.unit_id = u.id
          JOIN users usr ON t.user_id = usr.id
          ORDER BY t.created_at DESC
        `;
        [rows] = await db.query(query);
        break;

      // === TEAM MEMBERS EXPORT ===
      case 'team':
        query = `
          SELECT 
            id,
            username,
            role,
            created_at,
            last_login
          FROM users
          ORDER BY created_at DESC
        `;
        [rows] = await db.query(query);
        break;

      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: 'Server error while exporting data' });
  }
});

module.exports = router;
