const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ✅ Get all units
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM units ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

module.exports = router;
