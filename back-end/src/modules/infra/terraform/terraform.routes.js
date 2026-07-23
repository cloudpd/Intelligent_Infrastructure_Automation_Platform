const express = require('express');
const terraformController = require('./terraform.controller');
const authenticate = require('../../../core/middlewares/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/vpcs/:vpcId/generate', terraformController.generateNetworkFiles);
router.post('/repos/:repoId/generate', terraformController.generateEcrFiles);

module.exports = router;