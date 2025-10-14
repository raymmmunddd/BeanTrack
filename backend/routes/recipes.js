// routes/recipes.js
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

// ✅ Get all recipes with ingredients (with full status logic)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [recipes] = await db.query(`
      SELECT id, recipe_name AS name
      FROM recipes
      WHERE is_deleted = 0
      ORDER BY recipe_name ASC
    `);

    for (let recipe of recipes) {
      const [ingredients] = await db.query(`
        SELECT 
          ri.item_id,
          i.item_name,
          ri.quantity_required AS quantity,
          u.name AS unit,
          i.current_stock,
          i.minimum_stock,
          i.maximum_stock,
          CASE 
            WHEN i.current_stock = 0 THEN 'out'
            WHEN i.current_stock <= i.minimum_stock THEN 'low'
            WHEN i.current_stock <= (i.minimum_stock + (i.maximum_stock - i.minimum_stock) * 0.5) THEN 'medium'
            ELSE 'healthy'
          END AS status
        FROM recipe_ingredients ri
        JOIN items i ON ri.item_id = i.id
        JOIN units u ON i.unit_id = u.id
        WHERE ri.recipe_id = ? AND i.is_deleted = 0
        ORDER BY i.item_name ASC
      `, [recipe.id]);

      recipe.ingredients = ingredients;
    }

    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Server error fetching recipes' });
  }
});

// Get archived recipes (manager only)
router.get('/archived', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    const [recipes] = await db.query(`
      SELECT 
        id, 
        recipe_name as name,
        deleted_at,
        DATEDIFF(DATE_ADD(deleted_at, INTERVAL 30 DAY), NOW()) as days_until_deletion
      FROM recipes
      WHERE is_deleted = 1
      ORDER BY deleted_at DESC
    `);

    for (let recipe of recipes) {
      const [ingredients] = await db.query(`
        SELECT 
          ri.item_id,
          i.item_name,
          ri.quantity_required as quantity,
          u.name as unit
        FROM recipe_ingredients ri
        LEFT JOIN items i ON ri.item_id = i.id
        LEFT JOIN units u ON i.unit_id = u.id
        WHERE ri.recipe_id = ?
        ORDER BY i.item_name ASC
      `, [recipe.id]);

      recipe.ingredients = ingredients;
    }

    res.json(recipes);
  } catch (error) {
    console.error('Error fetching archived recipes:', error);
    res.status(500).json({ error: 'Server error fetching archived recipes' });
  }
});

// Create new recipe (manager only)
router.post('/', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await connection.beginTransaction();

    const { recipe_name, ingredients } = req.body;

    if (!recipe_name || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Recipe name and at least one ingredient required' 
      });
    }

    const [recipeResult] = await connection.query(`
      INSERT INTO recipes (recipe_name) VALUES (?)
    `, [recipe_name]);

    const recipeId = recipeResult.insertId;

    for (const ingredient of ingredients) {
      if (!ingredient.item_id || !ingredient.quantity_required || ingredient.quantity_required <= 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: 'Each ingredient must have a valid item_id and positive quantity' 
        });
      }

      // Check if item is not deleted
      const [itemCheck] = await connection.query(`
        SELECT id FROM items WHERE id = ? AND is_deleted = 0
      `, [ingredient.item_id]);

      if (itemCheck.length === 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: `Item with ID ${ingredient.item_id} not found or is archived` 
        });
      }

      await connection.query(`
        INSERT INTO recipe_ingredients (recipe_id, item_id, quantity_required)
        VALUES (?, ?, ?)
      `, [recipeId, ingredient.item_id, ingredient.quantity_required]);
    }

    await connection.query(`
      INSERT INTO transactions (recipe_id, transaction_type, user_id, notes)
      VALUES (?, 'added', ?, ?)
    `, [recipeId, req.user.id, `Recipe "${recipe_name}" created with ${ingredients.length} ingredient(s)`]);

    await connection.commit();
    res.status(201).json({
      message: 'Recipe created successfully',
      id: recipeId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating recipe:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Recipe with this name already exists' });
    } else {
      res.status(500).json({ error: 'Server error creating recipe' });
    }
  } finally {
    connection.release();
  }
});

// Update recipe (manager only)
router.put('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await connection.beginTransaction();

    const { recipe_name, ingredients } = req.body;

    if (!recipe_name || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Recipe name and at least one ingredient required' 
      });
    }

    const [result] = await connection.query(`
      UPDATE recipes SET recipe_name = ? WHERE id = ? AND is_deleted = 0
    `, [recipe_name, req.params.id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Recipe not found' });
    }

    await connection.query(`
      DELETE FROM recipe_ingredients WHERE recipe_id = ?
    `, [req.params.id]);

    for (const ingredient of ingredients) {
      if (!ingredient.item_id || !ingredient.quantity_required || ingredient.quantity_required <= 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: 'Each ingredient must have a valid item_id and positive quantity' 
        });
      }

      const [itemCheck] = await connection.query(`
        SELECT id FROM items WHERE id = ? AND is_deleted = 0
      `, [ingredient.item_id]);

      if (itemCheck.length === 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: `Item with ID ${ingredient.item_id} not found or is archived` 
        });
      }

      await connection.query(`
        INSERT INTO recipe_ingredients (recipe_id, item_id, quantity_required)
        VALUES (?, ?, ?)
      `, [req.params.id, ingredient.item_id, ingredient.quantity_required]);
    }

    await connection.query(`
      INSERT INTO transactions (recipe_id, transaction_type, user_id, notes)
      VALUES (?, 'update', ?, ?)
    `, [req.params.id, req.user.id, `Recipe "${recipe_name}" updated`]);

    await connection.commit();
    res.json({ message: 'Recipe updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating recipe:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Recipe with this name already exists' });
    } else {
      res.status(500).json({ error: 'Server error updating recipe' });
    }
  } finally {
    connection.release();
  }
});

// Soft delete recipe (manager only) - Archive
router.delete('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await connection.beginTransaction();

    const [recipes] = await connection.query(`
      SELECT recipe_name FROM recipes WHERE id = ? AND is_deleted = 0
    `, [req.params.id]);

    if (recipes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const recipeName = recipes[0].recipe_name;

    await connection.query(`
      INSERT INTO transactions (recipe_id, transaction_type, user_id, notes)
      VALUES (?, 'delete', ?, ?)
    `, [req.params.id, req.user.id, `Recipe "${recipeName}" archived`]);

    await connection.query(`
      UPDATE recipes 
      SET is_deleted = 1, deleted_at = NOW() 
      WHERE id = ?
    `, [req.params.id]);

    await connection.commit();
    res.json({ message: 'Recipe archived successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error archiving recipe:', error);
    res.status(500).json({ error: 'Server error archiving recipe' });
  } finally {
    connection.release();
  }
});

// Restore archived recipe (manager only)
router.post('/:id/restore', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await connection.beginTransaction();

    const [recipes] = await connection.query(`
      SELECT recipe_name FROM recipes WHERE id = ? AND is_deleted = 1
    `, [req.params.id]);

    if (recipes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Archived recipe not found' });
    }

    const recipeName = recipes[0].recipe_name;

    await connection.query(`
      UPDATE recipes 
      SET is_deleted = 0, deleted_at = NULL 
      WHERE id = ?
    `, [req.params.id]);

    await connection.query(`
      INSERT INTO transactions (recipe_id, transaction_type, user_id, notes)
      VALUES (?, 'restock', ?, ?)
    `, [req.params.id, req.user.id, `Recipe "${recipeName}" restored from archive`]);

    await connection.commit();
    res.json({ message: 'Recipe restored successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error restoring recipe:', error);
    res.status(500).json({ error: 'Server error restoring recipe' });
  } finally {
    connection.release();
  }
});

// Permanently delete archived recipe (manager only)
router.delete('/:id/permanent', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await connection.beginTransaction();

    const [recipes] = await connection.query(`
      SELECT recipe_name FROM recipes WHERE id = ? AND is_deleted = 1
    `, [req.params.id]);

    if (recipes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Archived recipe not found' });
    }

    const recipeName = recipes[0].recipe_name;

    await connection.query(`
      INSERT INTO transactions (recipe_id, transaction_type, user_id, notes)
      VALUES (?, 'delete', ?, ?)
    `, [req.params.id, req.user.id, `Recipe "${recipeName}" permanently deleted from archive`]);

    await connection.query(`DELETE FROM recipes WHERE id = ?`, [req.params.id]);

    await connection.commit();
    res.json({ message: 'Recipe permanently deleted' });
  } catch (error) {
    await connection.rollback();
    console.error('Error permanently deleting recipe:', error);
    res.status(500).json({ error: 'Server error permanently deleting recipe' });
  } finally {
    connection.release();
  }
});

// Auto-cleanup archived recipes older than 30 days (cron job endpoint)
router.post('/cleanup-archived', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await connection.beginTransaction();

    const [recipesToDelete] = await connection.query(`
      SELECT id, recipe_name
      FROM recipes 
      WHERE is_deleted = 1 
      AND deleted_at <= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    for (const recipe of recipesToDelete) {
      await connection.query(`
        INSERT INTO transactions (recipe_id, transaction_type, user_id, notes)
        VALUES (?, 'delete', ?, ?)
      `, [recipe.id, req.user.id, `Recipe "${recipe.recipe_name}" auto-deleted after 30 days in archive`]);

      await connection.query(`DELETE FROM recipes WHERE id = ?`, [recipe.id]);
    }

    await connection.commit();
    res.json({ 
      message: 'Cleanup completed',
      recipes_deleted: recipesToDelete.length
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error cleaning up archived recipes:', error);
    res.status(500).json({ error: 'Server error cleaning up recipes' });
  } finally {
    connection.release();
  }
});

module.exports = router;