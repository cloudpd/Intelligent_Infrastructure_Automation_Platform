const express = require('express');
const ciController = require('./ci.controller');
const authenticate = require('../../core/middlewares/authenticate');
const validateCIConfig = require('./ci.configMiddleware');

const router = express.Router();


router.use(authenticate);

router.get('/:serviceId/ci/get', ciController.getCIConfigController);

router.post('/:serviceId/ci/create', validateCIConfig, ciController.upsertCIConfigController);

router.get('/:serviceId/ci/preview', ciController.previewWorkflowController);

router.delete('/:serviceId/ci/delete', ciController.deleteCIConfigController);






module.exports = router;