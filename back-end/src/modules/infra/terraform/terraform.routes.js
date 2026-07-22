const express = require('express');
const terraformController = require('./terraform.controller');
const authenticate = require('../../../core/middlewares/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/vpcs/:vpcId/preview', terraformController.previewNetworkFiles);

module.exports = router;
