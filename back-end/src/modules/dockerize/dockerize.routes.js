const express = require('express');
const authenticate = require('../../core/middlewares/authenticate');
const validate = require('../../core/middlewares/validate');
const { existingDockerfileSchema, generateDockerfileSchema } = require('./dockerize.validation');
const {
  markExistingController,
  getTemplateController,
  generateController,
  getBuildConfigController,
} = require('./dockerize.controller');

const router = express.Router();

router.use(authenticate);

router.post('/existing', validate(existingDockerfileSchema), markExistingController);
router.get('/template/:language', getTemplateController);
router.post('/generate', validate(generateDockerfileSchema), generateController);
router.get('/build-config/:serviceId', getBuildConfigController);

module.exports = router;