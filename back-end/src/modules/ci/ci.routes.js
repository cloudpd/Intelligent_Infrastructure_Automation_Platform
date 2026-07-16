const express = require('express');
const ciController = require('./ci.controller');
const authenticate = require('../../core/middlewares/authenticate');
const validateCIConfig = require('./ci.configMiddleware');
const { pushSecretsSchema } = require('./ci.validation');
const validate = require('../../core/middlewares/validate');


const router = express.Router();


router.use(authenticate);

router.get('/:serviceId/ci/get', ciController.getCIConfigController);

router.post('/:serviceId/ci/create', validateCIConfig, ciController.upsertCIConfigController);

router.post("/:serviceId/ci/push", ciController.pushWorkflowToGithub);

router.get('/:serviceId/ci/preview', ciController.previewWorkflowController);

router.delete('/:serviceId/ci/delete', ciController.deleteCIConfigController);


router.post(
  "/:serviceId/ci/secrets",
  validate(pushSecretsSchema),
  ciController.pushSecrets
);




module.exports = router;