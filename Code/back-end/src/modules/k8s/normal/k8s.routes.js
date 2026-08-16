const express = require('express');
const k8sController = require('./k8s.controller');
const authenticate = require('../../../core/middlewares/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/:serviceId/k8s/get', k8sController.getKubernetesConfigController);

// Accepts the full wizard payload (all steps). Persists it, renders every
// manifest, and pushes to the repo unless { "dryRun": true } is sent.
router.post('/:serviceId/k8s/generate', k8sController.generateKubernetesManifestsController);

router.delete('/:serviceId/k8s/delete', k8sController.deleteKubernetesConfigController);

module.exports = router;
