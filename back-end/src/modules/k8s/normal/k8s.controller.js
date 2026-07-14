const k8sService = require('./k8s.service');
const { validateGenerateK8sPayload } = require('./k8s.validation');

async function getKubernetesConfigController(req, res, next) {
  try {
    const { serviceId } = req.params;
    const config = await k8sService.getWizardConfig(serviceId);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No Kubernetes configuration found for this service',
      });
    }

    res.status(200).json({ success: true, config });
  } catch (err) {
    next(err);
  }
}

async function generateKubernetesManifestsController(req, res, next) {
  try {
    const { serviceId } = req.params;
    const wizard = validateGenerateK8sPayload(req.body);

    const result = await k8sService.generateKubernetesManifests(req.user.id, serviceId, wizard);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteKubernetesConfigController(req, res, next) {
  try {
    const { serviceId } = req.params;
    await k8sService.deleteWizardConfig(serviceId);

    res.status(200).json({
      success: true,
      message: 'Kubernetes configuration deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getKubernetesConfigController,
  generateKubernetesManifestsController,
  deleteKubernetesConfigController,
};
