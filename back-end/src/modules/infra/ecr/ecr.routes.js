const express = require('express');
const controller = require('./ecr.controller');
const authenticate = require('../../../core/middlewares/authenticate');
const validate = require('../../../core/middlewares/validate');
const { createEcrSchema, updateEcrSchema } = require('./ecr.validation');

const router = express.Router();

router.use(authenticate);

router.post('/:serviceId/repos', validate(createEcrSchema), controller.createRepo);
router.get('/:serviceId/repos', controller.listRepos);
router.get('/repos/:repoId', controller.getRepo);
router.patch('/repos/:repoId', validate(updateEcrSchema), controller.updateRepo);
router.delete('/repos/:repoId', controller.deleteRepo);

/** Preview endpoint — what the Terraform generator will receive for this ECR repo */
router.get('/repos/:repoId/generator-config', controller.getGeneratorConfig);

module.exports = router;
