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

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    // Table sync handled by migrations or standard startup
    console.log('✅ Users table ready');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err);
  }
}

start();