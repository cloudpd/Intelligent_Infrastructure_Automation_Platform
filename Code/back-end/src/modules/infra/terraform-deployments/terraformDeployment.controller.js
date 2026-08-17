const terraformDeploymentService = require('./terraformDeployment.service');

/**
 * GET /infra/terraform-deployments
 *
 * Every currently-applied deployment owned by this user, across every
 * project/service — powers the "Active projects" panel, which has no
 * single service to scope a request to.
 */
async function listAllController(req, res, next) {
  try {
    const deployments = await terraformDeploymentService.listAllForUser(req.user.id);
    res.status(200).json({ success: true, deployments });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /infra/terraform-deployments/services/:serviceId
 *
 * Lists the deployment(s) currently on record for this service — in
 * practice at most one per environment, since a successful destroy hard
 * deletes its row. Useful for the UI to know which environments actually
 * have real infrastructure right now, independent of whatever the
 * `generated/` scratch directory currently contains.
 */
async function listController(req, res, next) {
  try {
    const deployments = await terraformDeploymentService.listDeployments(req.user.id, req.params.serviceId);
    res.status(200).json({ success: true, deployments });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /infra/terraform-deployments/:deploymentId
 */
async function getController(req, res, next) {
  try {
    const deployment = await terraformDeploymentService.getOwnedDeploymentById(req.params.deploymentId, req.user.id);
    res.status(200).json({ success: true, deployment });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /infra/terraform-deployments/services/:serviceId/destroy
 * Body: { environment, awsCredentialId? }
 *
 * Mirrors terraform.controller.js's applyVmFiles/applyEksFiles shape:
 * validates + locks synchronously, responds 202 immediately, then runs
 * the actual `terraform destroy` in the background against a disposable
 * copy of the deployment's immutable snapshot — never against whatever
 * `generated/<slug>/<env>/` currently holds.
 */
async function destroyController(req, res, next) {
  try {
    const { serviceId } = req.params;
    const { environment, awsCredentialId } = req.body;

    const { deployment, creds } = await terraformDeploymentService.prepareDestroy({
      serviceId,
      environment,
      userId: req.user.id,
      awsCredentialId,
    });

    res.status(202).json({ success: true, message: 'Terraform destroy started', status: 'destroying' });

    terraformDeploymentService
      .runDestroy(deployment, creds)
      .catch((err) => {
        console.error(`Terraform destroy failed for service ${serviceId} (${environment}):`, err.message);
      });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAllController,
  listController,
  getController,
  destroyController,
};