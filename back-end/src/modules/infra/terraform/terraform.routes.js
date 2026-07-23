const express = require('express');
const terraformController = require('./terraform.controller');
const authenticate = require('../../../core/middlewares/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/vpcs/:vpcId/generate', terraformController.generateNetworkFiles);

module.exports = router;
