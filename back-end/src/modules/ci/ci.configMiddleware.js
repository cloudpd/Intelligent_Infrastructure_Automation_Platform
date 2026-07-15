const { validateCIConfig } = require('./ci.validation');
const AppError = require('../../core/utils/AppError');



function validateCIConfigMiddleware(req, res, next) {
  try {
    const body = req.body || {};
    const {
      pipelineName,
      triggerBranch,
      registry,
      imageName,
      awsEcrRegion,
    } = body;

    const enableTrivy = body.enableTrivy !== undefined ? body.enableTrivy : body.enabletrivy;
    const enableLint = body.enableLint !== undefined ? body.enableLint : body.enablelint;
    const enableTests = body.enableTests !== undefined ? body.enableTests : body.enabletests;
    const enableBuild = body.enableBuild !== undefined ? body.enableBuild : body.enablebuild;
    const enableInstall = body.enableInstall !== undefined ? body.enableInstall : body.enableinstall;

    const serviceId = req.params.serviceId || body.serviceId;

    if (!serviceId) {
      throw new AppError('Service ID is required', 400);
    }

    const configData = {
      serviceId,
      pipelineName,
      triggerBranch,
      registry,
      imageName,
      enableTrivy,
      enableLint,
      enableTests,
      enableBuild,
      enableInstall,
      awsEcrRegion,
    };

    req.ciConfig = validateCIConfig(configData);

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = validateCIConfigMiddleware;
