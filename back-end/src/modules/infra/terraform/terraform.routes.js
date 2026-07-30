const express = require('express');
const terraformController = require('./terraform.controller');
const authenticate = require('../../../core/middlewares/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/vpcs/:vpcId/generate', terraformController.generateNetworkFiles);
router.post('/repos/:repoId/generate', terraformController.generateEcrFiles);
router.post('/vpcs/:vpcId/clusters/:clusterId/generate', terraformController.generateEksFiles);
router.post('/vpcs/:vpcId/vms/:vmId/generate', terraformController.generateVmFiles);
router.post('/vpcs/:vpcId/vms/:vmId/apply', terraformController.applyVmFiles);
router.post('/vpcs/:vpcId/clusters/:clusterId/apply', terraformController.applyEksFiles);

/**
 * Unified generate: always renders Network for the service, and
 * conditionally renders ECR / EKS / VM based on whichever of those
 * modules already exist in the DB for this service.
 */
router.post('/services/:serviceId/generate', terraformController.generateServiceFiles);

module.exports = router;