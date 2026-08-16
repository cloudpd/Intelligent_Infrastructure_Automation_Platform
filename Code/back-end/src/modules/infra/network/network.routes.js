const express = require('express');
const controller = require('./network.controller');
const authenticate = require('../../../core/middlewares/authenticate');
const validate = require('../../../core/middlewares/validate');
const { createVpcSchema, updateVpcSchema } = require('./network.validation');

const router = express.Router();

router.use(authenticate);

router.post('/:serviceId/vpcs', validate(createVpcSchema), controller.createVpc);
router.get('/:serviceId/vpcs', controller.listVpcs);
router.get('/vpcs/:vpcId', controller.getVpc);
router.patch('/vpcs/:vpcId', validate(updateVpcSchema), controller.updateVpc);
router.delete('/vpcs/:vpcId', controller.deleteVpc);

/** Preview endpoint — what the Terraform generator will receive for this VPC */
router.get('/vpcs/:vpcId/generator-config', controller.getGeneratorConfig);

module.exports = router;
