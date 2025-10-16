// auth.js - Fixed JWT token structure with INTEGER is_deleted

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();

// Password validation function
const validatePassword = (password) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumber && hasSymbol;
};

// Sign Up Route
router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    if (password.length < 12) {
      return res.status(400).json({ 
        error: 'Password must be at least 12 characters' 
      });
    }

    // Validate password strength
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        error: 'Password must include uppercase, lowercase, number, and symbol' 
      });
    }

    // Check if username already exists (exclude soft-deleted)
    const existingUsers = await db.query(
      'SELECT id FROM users WHERE username = $1 AND (is_deleted = 0 OR is_deleted IS NULL)',
      [username]
    );

    if (existingUsers.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Username already exists' 
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user (role is automatically 'barista' by default)
    const result = await db.query(
      'INSERT INTO users (username, password, role, is_deleted) VALUES ($1, $2, $3, 0) RETURNING id',
      [username, hashedPassword, 'barista']
    );

    const userId = result.rows[0].id;

    // Create JWT token - USING CONSISTENT FIELD NAMES
    const token = jwt.sign(
      { 
        userId: userId,      // ← Primary field for consistency
        id: userId,          // ← Backward compatibility
        username: username, 
        role: 'barista' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: userId,
        username: username,
        role: 'barista'
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Server error during signup' 
    });
  }
});

// Sign In Route
router.post('/signin', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validation
    if (!username || !password || !role) {
      return res.status(400).json({ 
        error: 'Username, password, and role are required' 
      });
    }

    // Find user by username (exclude soft-deleted)
    const users = await db.query(
      'SELECT id, username, password, role FROM users WHERE username = $1 AND (is_deleted = 0 OR is_deleted IS NULL)',
      [username]
    );

    // Check if user exists
    if (users.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    const user = users.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ 
        error: 'Invalid password' 
      });
    }

    // Check if the role matches
    if (user.role !== role) {
      return res.status(403).json({ 
        error: `This account is not registered as a ${role}` 
      });
    }

    // Update last login time
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Create JWT token - USING CONSISTENT FIELD NAMES
    const token = jwt.sign(
      { 
        userId: user.id,     // ← Primary field for consistency
        id: user.id,         // ← Backward compatibility
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Sign in successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ 
      error: 'Server error during signin' 
    });
  }
});

module.exports = router;
