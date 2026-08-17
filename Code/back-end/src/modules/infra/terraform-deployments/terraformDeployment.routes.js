const express = require('express');
const authenticate = require('../../../core/middlewares/authenticate');
const validate = require('../../../core/middlewares/validate');
const terraformDeploymentController = require('./terraformDeployment.controller');
const { destroySchema } = require('./terraformDeployment.validation');

const router = express.Router();

router.use(authenticate);

router.get('/', terraformDeploymentController.listAllController);
router.get('/services/:serviceId', terraformDeploymentController.listController);
router.get('/:deploymentId', terraformDeploymentController.getController);
router.post(
  '/services/:serviceId/destroy',
  validate(destroySchema),
  terraformDeploymentController.destroyController
);

module.exports = router;