const express = require('express');
const {
  createServiceController,
  getServiceController,
  getProjectServicesController,
  updateServiceController,
  deleteServiceController,
} = require('./service.controller');
const authenticate = require('../../core/middlewares/authenticate');
const validate = require('../../core/middlewares/validate');
const { createServiceSchema, updateServiceSchema } = require('./service.validation');

const router = express.Router();

router.use(authenticate);

router.post('/create/:projectId', validate(createServiceSchema), createServiceController);
router.get('/list/:projectId', getProjectServicesController);
router.get('/get/:id', getServiceController);
router.put('/update/:id', validate(updateServiceSchema), updateServiceController);
router.delete('/delete/:id', deleteServiceController);

module.exports = router;