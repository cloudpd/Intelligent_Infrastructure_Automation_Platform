const express = require('express');
const controller = require('./eks.controller');
const authenticate = require('../../../core/middlewares/authenticate');
const validate = require('../../../core/middlewares/validate');
const { createEksClusterSchema, updateEksClusterSchema } = require('./eks.validation');

const router = express.Router();

router.use(authenticate);

router.post('/:serviceId/clusters', validate(createEksClusterSchema), controller.createCluster);
router.get('/:serviceId/clusters', controller.listClusters);
router.get('/clusters/:clusterId', controller.getCluster);
router.patch('/clusters/:clusterId', validate(updateEksClusterSchema), controller.updateCluster);
router.delete('/clusters/:clusterId', controller.deleteCluster);

/** Preview endpoint — what the Terraform generator will receive for this cluster */
router.get('/clusters/:clusterId/generator-config', controller.getGeneratorConfig);

module.exports = router;
