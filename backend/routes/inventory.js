// inventory.js - PostgreSQL Compatible

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

// Get all inventory items with new status logic (exclude soft-deleted)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        i.id,
        i.item_name as name,
        c.name as category,
        i.category_id,
        u.name as unit,
        i.unit_id,
        i.current_stock as current_quantity,
        i.minimum_stock as min_threshold,
        i.maximum_stock as max_threshold,
        i.description,
        i.ordered,
        i.created_at,
        i.updated_at,
        CASE 
          WHEN i.current_stock = 0 THEN 'out'
          WHEN i.current_stock <= i.minimum_stock THEN 'low'
          WHEN i.current_stock <= (i.minimum_stock + (i.maximum_stock - i.minimum_stock) * 0.5) THEN 'medium'
          ELSE 'healthy'
        END as status
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN units u ON i.unit_id = u.id
      WHERE i.is_deleted = false
      ORDER BY i.item_name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Server error fetching inventory' });
  }
});

// Get archived items (manager only)
router.get('/archived', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    const result = await db.query(`
      SELECT 
        i.id,
        i.item_name as name,
        c.name as category,
        u.name as unit,
        i.current_stock as current_quantity,
        i.minimum_stock as min_threshold,
        i.maximum_stock as max_threshold,
        i.description,
        i.deleted_at,
        EXTRACT(DAY FROM (i.deleted_at + INTERVAL '30 days' - NOW())) as days_until_deletion
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN units u ON i.unit_id = u.id
      WHERE i.is_deleted = true
      ORDER BY i.deleted_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching archived items:', error);
    res.status(500).json({ error: 'Server error fetching archived items' });
  }
});

// Get recent activity for current user (exclude deleted items)
router.get('/recent-activity', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        t.id,
        i.item_name,
        un.name AS unit_name,  
        t.transaction_type,
        t.quantity,
        t.notes,
        t.created_at
      FROM transactions t
      LEFT JOIN items i ON t.item_id = i.id
      LEFT JOIN units un ON i.unit_id = un.id
      WHERE t.user_id = $1 AND (i.is_deleted = false OR i.id IS NULL)
      ORDER BY t.created_at DESC
      LIMIT 3
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Server error fetching activity' });
  }
});

// Get recent activity for all users (manager only, exclude deleted items)
router.get('/recent-activity-all', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        t.id,
        i.item_name,
        r.recipe_name,
        un.name AS unit_name,  
        t.transaction_type,
        t.quantity,
        t.notes,
        t.created_at,
        u.username
      FROM transactions t
      LEFT JOIN items i ON t.item_id = i.id
      LEFT JOIN recipes r ON t.recipe_id = r.id
      LEFT JOIN units un ON i.unit_id = un.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE (i.is_deleted = false OR i.id IS NULL) AND (r.is_deleted = false OR r.id IS NULL)
      ORDER BY t.created_at DESC
      LIMIT 3
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Server error fetching activity' });
  }
});

// Get all transactions (for manager only, show all including deleted)
router.get('/transactions/all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    const result = await db.query(`
      SELECT 
        t.id,
        i.item_name,
        un.name AS unit_name,
        t.transaction_type,
        t.quantity,
        t.notes,
        t.created_at,
        u.username
      FROM transactions t
      LEFT JOIN items i ON t.item_id = i.id
      LEFT JOIN units un ON i.unit_id = un.id
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ error: 'Server error fetching transactions' });
  }
});

// Get single inventory item by ID (exclude deleted)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        i.id,
        i.item_name as name,
        c.name as category,
        i.category_id,
        u.name as unit,
        i.unit_id,
        i.current_stock as current_quantity,
        i.minimum_stock as min_threshold,
        i.maximum_stock as max_threshold,
        i.description,
        i.ordered,
        i.created_at,
        i.updated_at,
        CASE 
          WHEN i.current_stock = 0 THEN 'out'
          WHEN i.current_stock <= i.minimum_stock THEN 'low'
          WHEN i.current_stock <= (i.minimum_stock + (i.maximum_stock - i.minimum_stock) * 0.5) THEN 'medium'
          ELSE 'healthy'
        END as status
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN units u ON i.unit_id = u.id
      WHERE i.id = $1 AND i.is_deleted = false
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ error: 'Server error fetching item' });
  }
});

// Log recipe usage - deduct ingredients based on servings
router.post('/log-recipe-usage', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    const { recipe_id, servings } = req.body;

    if (!recipe_id || !servings || servings <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Recipe ID and positive servings count required' 
      });
    }

    // Get recipe ingredients (only non-deleted items)
    const ingredientsResult = await client.query(`
      SELECT 
        ri.item_id,
        ri.quantity_required,
        i.item_name,
        i.current_stock,
        u.name as unit
      FROM recipe_ingredients ri
      JOIN items i ON ri.item_id = i.id
      JOIN units u ON i.unit_id = u.id
      WHERE ri.recipe_id = $1 AND i.is_deleted = false
    `, [recipe_id]);

    const ingredients = ingredientsResult.rows;

    if (ingredients.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found or has no ingredients' });
    }

    const insufficientStock = [];
    for (const ing of ingredients) {
      const requiredQuantity = ing.quantity_required * servings;
      if (ing.current_stock < requiredQuantity) {
        insufficientStock.push({
          item: ing.item_name,
          required: requiredQuantity,
          available: ing.current_stock,
          unit: ing.unit
        });
      }
    }

    if (insufficientStock.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Insufficient stock',
        details: insufficientStock
      });
    }

    for (const ing of ingredients) {
      const quantityToDeduct = ing.quantity_required * servings;
      await client.query(`
        UPDATE items 
        SET current_stock = current_stock - $1
        WHERE id = $2
      `, [quantityToDeduct, ing.item_id]);

      await client.query(`
        INSERT INTO transactions 
          (item_id, recipe_id, transaction_type, quantity, user_id, notes)
        VALUES ($1, $2, 'usage', $3, $4, $5)
      `, [
        ing.item_id,
        recipe_id,
        quantityToDeduct,
        req.user.id,
        `Recipe usage: ${servings} serving(s)`
      ]);
    }

    await client.query('COMMIT');
    res.json({ 
      message: 'Usage logged successfully',
      servings: servings,
      items_updated: ingredients.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error logging recipe usage:', error);
    res.status(500).json({ error: 'Server error logging usage' });
  } finally {
    client.release();
  }
});

// Log manual usage - deduct custom quantities
router.post('/log-manual-usage', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Items array required with at least one item' 
      });
    }

    for (const item of items) {
      if (!item.item_id || !item.quantity || item.quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Each item must have item_id and positive quantity' 
        });
      }
    }

    const insufficientStock = [];
    for (const item of items) {
      const stockCheckResult = await client.query(`
        SELECT item_name, current_stock, u.name as unit
        FROM items i
        JOIN units u ON i.unit_id = u.id
        WHERE i.id = $1 AND i.is_deleted = false
      `, [item.item_id]);

      if (stockCheckResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Item with ID ${item.item_id} not found` });
      }

      if (stockCheckResult.rows[0].current_stock < item.quantity) {
        insufficientStock.push({
          item: stockCheckResult.rows[0].item_name,
          required: item.quantity,
          available: stockCheckResult.rows[0].current_stock,
          unit: stockCheckResult.rows[0].unit
        });
      }
    }

    if (insufficientStock.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Insufficient stock',
        details: insufficientStock
      });
    }

    for (const item of items) {
      await client.query(`
        UPDATE items 
        SET current_stock = current_stock - $1
        WHERE id = $2
      `, [item.quantity, item.item_id]);

      await client.query(`
        INSERT INTO transactions 
          (item_id, transaction_type, quantity, user_id, notes)
        VALUES ($1, 'usage', $2, $3, 'Manual usage entry')
      `, [item.item_id, item.quantity, req.user.id]);
    }

    await client.query('COMMIT');
    res.json({ 
      message: 'Manual usage logged successfully',
      items_updated: items.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error logging manual usage:', error);
    res.status(500).json({ error: 'Server error logging usage' });
  } finally {
    client.release();
  }
});

// Create new inventory item (manager only)
router.post('/', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await client.query('BEGIN');

    const { item_name, category_id, unit_id, current_stock, minimum_stock, maximum_stock, description } = req.body;

    if (!item_name || !category_id || current_stock === undefined || !unit_id || 
        minimum_stock === undefined || maximum_stock === undefined) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'All required fields must be provided (item_name, category_id, unit_id, current_stock, minimum_stock, maximum_stock)' 
      });
    }

    // Validate min/max thresholds
    if (minimum_stock > maximum_stock) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Minimum stock cannot exceed maximum stock' 
      });
    }

    // Check for duplicate name
    const duplicatesResult = await client.query(`
      SELECT id FROM items 
      WHERE LOWER(TRIM(item_name)) = LOWER(TRIM($1)) 
      AND is_deleted = false
    `, [item_name]);

    if (duplicatesResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'An item with this name already exists' 
      });
    }

    const result = await client.query(`
      INSERT INTO items 
        (item_name, category_id, unit_id, current_stock, minimum_stock, maximum_stock, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [item_name, category_id, unit_id, current_stock, minimum_stock, maximum_stock, description || null]);

    const itemId = result.rows[0].id;

    await client.query(`
      INSERT INTO transactions 
        (item_id, transaction_type, quantity, user_id, notes)
      VALUES ($1, 'added', $2, $3, $4)
    `, [itemId, current_stock, req.user.id, `New item "${item_name}" added to inventory`]);

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Item created successfully',
      id: itemId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating inventory item:', error);
    res.status(500).json({ error: 'Server error creating item' });
  } finally {
    client.release();
  }
});

// Update entire inventory item (manager only)
router.put('/:id', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await client.query('BEGIN');

    const { item_name, category_id, unit_id, current_stock, minimum_stock, maximum_stock, description } = req.body;

    if (!item_name || current_stock === undefined || 
        minimum_stock === undefined || maximum_stock === undefined) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'All required fields must be provided' 
      });
    }

    // Validate min/max thresholds
    if (minimum_stock > maximum_stock) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Minimum stock cannot exceed maximum stock' 
      });
    }

    // Check for duplicate name (excluding current item)
    const duplicatesResult = await client.query(`
      SELECT id FROM items 
      WHERE LOWER(TRIM(item_name)) = LOWER(TRIM($1)) 
      AND id != $2 
      AND is_deleted = false
    `, [item_name, req.params.id]);

    if (duplicatesResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'An item with this name already exists' 
      });
    }

    const oldItemsResult = await client.query(`
      SELECT * FROM items WHERE id = $1 AND is_deleted = false
    `, [req.params.id]);
    
    if (oldItemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }
    const oldItem = oldItemsResult.rows[0];

    const result = await client.query(`
      UPDATE items 
      SET item_name = $1, category_id = $2, unit_id = $3, current_stock = $4, 
          minimum_stock = $5, maximum_stock = $6, description = $7
      WHERE id = $8 AND is_deleted = false
    `, [item_name, category_id, unit_id, current_stock, minimum_stock, maximum_stock, description || null, req.params.id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }

    await client.query(`
      INSERT INTO transactions (item_id, transaction_type, quantity, user_id, notes)
      VALUES ($1, 'update', $2, $3, $4)
    `, [
      req.params.id,
      current_stock, 
      req.user.id,
      `Item updated. Old stock: ${oldItem.current_stock}, New stock: ${current_stock}`
    ]);

    await client.query('COMMIT');
    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: 'Server error updating item' });
  } finally {
    client.release();
  }
});

// Soft delete inventory item (manager only) - Archive
router.delete('/:id', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await client.query('BEGIN');

    const itemsResult = await client.query(`
      SELECT * FROM items WHERE id = $1 AND is_deleted = false
    `, [req.params.id]);
    
    if (itemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }
    const item = itemsResult.rows[0];

    await client.query(`
      INSERT INTO transactions (item_id, transaction_type, quantity, user_id, notes)
      VALUES ($1, 'delete', $2, $3, $4)
    `, [req.params.id, item.current_stock, req.user.id, `Item "${item.item_name}" archived`]);

    await client.query(`
      UPDATE items 
      SET is_deleted = true, deleted_at = NOW() 
      WHERE id = $1
    `, [req.params.id]);

    await client.query('COMMIT');
    res.json({ message: 'Item archived successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error archiving inventory item:', error);
    res.status(500).json({ error: 'Server error archiving item' });
  } finally {
    client.release();
  }
});

// Restore archived item (manager only)
router.post('/:id/restore', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await client.query('BEGIN');

    const itemsResult = await client.query(`
      SELECT * FROM items WHERE id = $1 AND is_deleted = true
    `, [req.params.id]);
    
    if (itemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Archived item not found' });
    }
    const item = itemsResult.rows[0];

    await client.query(`
      UPDATE items 
      SET is_deleted = false, deleted_at = NULL 
      WHERE id = $1
    `, [req.params.id]);

    await client.query(`
      INSERT INTO transactions (item_id, transaction_type, quantity, user_id, notes)
      VALUES ($1, 'restock', $2, $3, $4)
    `, [req.params.id, item.current_stock, req.user.id, `Item "${item.item_name}" restored from archive`]);

    await client.query('COMMIT');
    res.json({ message: 'Item restored successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error restoring inventory item:', error);
    res.status(500).json({ error: 'Server error restoring item' });
  } finally {
    client.release();
  }
});

// Permanently delete archived item (manager only)
router.delete('/:id/permanent', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await client.query('BEGIN');

    const itemsResult = await client.query(`
      SELECT * FROM items WHERE id = $1 AND is_deleted = true
    `, [req.params.id]);
    
    if (itemsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Archived item not found' });
    }
    const item = itemsResult.rows[0];

    await client.query(`
      INSERT INTO transactions (item_id, transaction_type, quantity, user_id, notes)
      VALUES ($1, 'delete', $2, $3, $4)
    `, [req.params.id, item.current_stock, req.user.id, `Item "${item.item_name}" permanently deleted from archive`]);

    await client.query(`DELETE FROM items WHERE id = $1`, [req.params.id]);

    await client.query('COMMIT');
    res.json({ message: 'Item permanently deleted' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error permanently deleting item:', error);
    res.status(500).json({ error: 'Server error permanently deleting item' });
  } finally {
    client.release();
  }
});

// Auto-cleanup archived items older than 30 days (cron job endpoint)
router.post('/cleanup-archived', authenticateToken, async (req, res) => {
  const client = await db.connect();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await client.query('BEGIN');

    const itemsToDeleteResult = await client.query(`
      SELECT id, item_name, current_stock
      FROM items 
      WHERE is_deleted = true 
      AND deleted_at <= NOW() - INTERVAL '30 days'
    `);

    const itemsToDelete = itemsToDeleteResult.rows;

    for (const item of itemsToDelete) {
      await client.query(`
        INSERT INTO transactions (item_id, transaction_type, quantity, user_id, notes)
        VALUES ($1, 'delete', $2, $3, $4)
      `, [item.id, item.current_stock, req.user.id, `Item "${item.item_name}" auto-deleted after 30 days in archive`]);

      await client.query(`DELETE FROM items WHERE id = $1`, [item.id]);
    }

    await client.query('COMMIT');
    res.json({ 
      message: 'Cleanup completed',
      items_deleted: itemsToDelete.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cleaning up archived items:', error);
    res.status(500).json({ error: 'Server error cleaning up items' });
  } finally {
    client.release();
  }
});

module.exports = router;
