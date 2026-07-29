const terraformStateService = require('./terraformState.service');

/**
 * POST /terraform/setup
 * Body: { serviceId, s3Bucket, useEcr }
 */
async function setupController(req, res, next) {
  try {
    const state = await terraformStateService.saveSetup(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Terraform setup saved successfully',
      terraformState: state,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /terraform/deployment
 * Body: { serviceId, deploymentType }
 */
async function deploymentController(req, res, next) {
  try {
    const state = await terraformStateService.saveDeployment(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Deployment type saved successfully',
      terraformState: state,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /terraform/state/:serviceId
 */
async function getStateController(req, res, next) {
  try {
    const state = await terraformStateService.getState(req.user.id, req.params.serviceId);
    res.status(200).json({
      success: true,
      terraformState: {
        serviceId: state.service_id,
        awsCredentialId: state.aws_credential_id,
        s3Bucket: state.s3_bucket,
        lockTable: state.lock_table,
        useEcr: state.use_ecr,
        deploymentType: state.deployment_type,
        generated: state.generated,
        applied: state.applied,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /terraform/generate
 * Body: { serviceId, serviceSlug?, environment? }
 */
async function generateController(req, res, next) {
  try {
    const { serviceId, serviceSlug, environment } = req.body;
    const result = await terraformStateService.generate(req.user.id, { serviceId, serviceSlug, environment });
    res.status(200).json({
      success: true,
      message: 'Terraform files generated.',
      outputDir: result.outputDir,
      modules: result.modules,
      // Only non-empty when a module was auto-provisioned this call with
      // placeholder/generated values (e.g. a fresh EKS cluster's Grafana
      // password) — surfaced once since some of these can't be read back
      // out later (the password is stored encrypted).
      generatedSecrets: result.generatedSecrets,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  setupController,
  deploymentController,
  getStateController,
  generateController,
};
