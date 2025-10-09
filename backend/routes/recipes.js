// recipes.js

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

// Get all recipes with their ingredients
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get all recipes
    const [recipes] = await db.query(`
      SELECT id, recipe_name as name
      FROM recipes
      ORDER BY recipe_name ASC
    `);

    // For each recipe, get its ingredients with stock status
    for (let recipe of recipes) {
      const [ingredients] = await db.query(`
        SELECT 
          ri.item_id,
          i.item_name,
          ri.quantity_required as quantity,
          u.name as unit,
          i.current_stock,
          CASE 
            WHEN i.current_stock <= i.minimum_stock THEN 'low'
            ELSE 'in_stock'
          END as status
        FROM recipe_ingredients ri
        JOIN items i ON ri.item_id = i.id
        JOIN units u ON i.unit_id = u.id
        WHERE ri.recipe_id = ?
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

    // Create recipe
    const [recipeResult] = await connection.query(`
      INSERT INTO recipes (recipe_name) VALUES (?)
    `, [recipe_name]);

    const recipeId = recipeResult.insertId;

    // Add ingredients
    for (const ingredient of ingredients) {
      if (!ingredient.item_id || !ingredient.quantity_required || ingredient.quantity_required <= 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: 'Each ingredient must have a valid item_id and positive quantity' 
        });
      }

      await connection.query(`
        INSERT INTO recipe_ingredients (recipe_id, item_id, quantity_required)
        VALUES (?, ?, ?)
      `, [recipeId, ingredient.item_id, ingredient.quantity_required]);
    }

    // Log transaction for recipe creation
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

    // Update recipe name
    const [result] = await connection.query(`
      UPDATE recipes SET recipe_name = ? WHERE id = ?
    `, [recipe_name, req.params.id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Delete existing ingredients
    await connection.query(`
      DELETE FROM recipe_ingredients WHERE recipe_id = ?
    `, [req.params.id]);

    // Add new ingredients
    for (const ingredient of ingredients) {
      if (!ingredient.item_id || !ingredient.quantity_required || ingredient.quantity_required <= 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: 'Each ingredient must have a valid item_id and positive quantity' 
        });
      }

      await connection.query(`
        INSERT INTO recipe_ingredients (recipe_id, item_id, quantity_required)
        VALUES (?, ?, ?)
      `, [req.params.id, ingredient.item_id, ingredient.quantity_required]);
    }

    // Log transaction for recipe update
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

// Delete recipe (manager only)
router.delete('/:id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    await connection.beginTransaction();

    // Get recipe name before deletion
    const [recipes] = await connection.query(`
      SELECT recipe_name FROM recipes WHERE id = ?
    `, [req.params.id]);

    if (recipes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const recipeName = recipes[0].recipe_name;

    // Log transaction before deletion
    await connection.query(`
      INSERT INTO transactions (recipe_id, transaction_type, user_id, notes)
      VALUES (?, 'delete', ?, ?)
    `, [req.params.id, req.user.id, `Recipe "${recipeName}" deleted`]);

    // Delete recipe (cascade will delete ingredients)
    await connection.query(`
      DELETE FROM recipes WHERE id = ?
    `, [req.params.id]);

    await connection.commit();
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Server error deleting recipe' });
  } finally {
    connection.release();
  }
});

module.exports = router;