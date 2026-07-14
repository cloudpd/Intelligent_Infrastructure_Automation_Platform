const express = require('express');
const authenticate = require('../../core/middlewares/authenticate');
const validate = require('../../core/middlewares/validate');
const { existingDockerfileSchema, generateDockerfileSchema } = require('./dockerize.validation');
const {
  markExistingController,
  getLanguageDefaultsController,
  generateController,
  getBuildConfigController,
} = require('./dockerize.controller');

const router = express.Router();

router.use(authenticate);

router.post('/existing', validate(existingDockerfileSchema), markExistingController);
router.get('/defaults/:language', getLanguageDefaultsController); // was /template/:language
router.post('/generate', validate(generateDockerfileSchema), generateController);
router.get('/build-config/:serviceId', getBuildConfigController);

module.exports = router;