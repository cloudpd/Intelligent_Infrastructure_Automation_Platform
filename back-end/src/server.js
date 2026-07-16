require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');
require('./modules/auth/auth.model');
require('./modules/projects/projects.model');
require('./modules/github/github.model');
require('./modules/ci/ci.model');


const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    await sequelize.sync();
    console.log('✅ Users table synced');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err);
  }
}

start();