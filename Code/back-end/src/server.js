require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');
require('./modules/auth/auth.model');
require('./modules/projects/projects.model');
require('./modules/github/github.model');
require('./modules/ci/ci.model');
require('./modules/infra/network/network.model');
require('./modules/infra/ecr/ecr.model');
require('./modules/infra/vm/vm.model');
require('./modules/infra/terraform-state/terraformState.model');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost'; //in dev work in localhost on prod work on 0.0.0.0

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    // Table sync handled by migrations or standard startup
    console.log('✅ Users table ready');
    // await sequelize.sync({ alter: true });
    console.log('✅ Database models synced successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err);
  }
}

start();





