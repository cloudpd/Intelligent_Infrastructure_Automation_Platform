const express = require('express');
const authenticate = require('../../../core/middlewares/authenticate');
const validate = require('../../../core/middlewares/validate');
const {
  setupController,
  deploymentController,
  getStateController,
  generateController,
} = require('./terraformState.controller');
const { setupSchema, deploymentSchema, generateSchema } = require('./terraformState.validation');

const router = express.Router();

router.use(authenticate);

router.post('/setup', validate(setupSchema), setupController);
router.put('/deployment', validate(deploymentSchema), deploymentController);
router.get('/state/:serviceId', getStateController);
router.post('/generate', validate(generateSchema), generateController);

module.exports = router;
