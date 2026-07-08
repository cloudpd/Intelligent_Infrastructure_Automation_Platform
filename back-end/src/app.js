const express = require('express');
const authRoutes = require('./modules/auth/auth.routes');
const projectsRoutes = require('./modules/projects/projects.routes');
const errorHandler = require('./core/middlewares/errorHandler');

const app = express();

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/projects', projectsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;