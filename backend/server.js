// server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const usersRouter = require('./routes/users');
const recipesRouter = require('./routes/recipes');
const categoriesRoutes = require('./routes/categories');
const unitsRoutes = require('./routes/units');
const exportRoutes = require('./routes/export');
const orderingRoutes = require('./routes/ordering');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', usersRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/categories', categoriesRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/ordering', orderingRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'CafeStock API is running!' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});