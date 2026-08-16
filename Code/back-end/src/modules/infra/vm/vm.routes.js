const express = require('express');
const controller = require('./vm.controller');
const authenticate = require('../../../core/middlewares/authenticate');
const validate = require('../../../core/middlewares/validate');
const { createVmSchema, updateVmSchema } = require('./vm.validation');

const router = express.Router();

router.use(authenticate);

router.post('/:serviceId/vms', validate(createVmSchema), controller.createVm);
router.get('/:serviceId/vms', controller.listVms);
router.get('/vms/:vmId', controller.getVm);
router.patch('/vms/:vmId', validate(updateVmSchema), controller.updateVm);
router.delete('/vms/:vmId', controller.deleteVm);

/** Preview endpoint — what the Terraform generator will receive for this VM */
router.get('/vms/:vmId/generator-config', controller.getGeneratorConfig);

module.exports = router;