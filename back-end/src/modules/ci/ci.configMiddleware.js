const { validateCIConfig } = require('./ci.validation');
const AppError = require('../../core/utils/AppError');


 
function validateCIConfigMiddleware(req, res, next) {
  try {
    const {
      pipelineName,
      triggerBranch,
      registry,
      imageName,
      awsEcrRegion,
    } = req.body;

    const enableTrivy = req.body.enableTrivy !== undefined ? req.body.enableTrivy : req.body.enabletrivy;
    const enableLint = req.body.enableLint !== undefined ? req.body.enableLint : req.body.enablelint;
    const enableTests = req.body.enableTests !== undefined ? req.body.enableTests : req.body.enabletests;
    const enableBuild = req.body.enableBuild !== undefined ? req.body.enableBuild : req.body.enablebuild;
    const enableInstall = req.body.enableInstall !== undefined ? req.body.enableInstall : req.body.enableinstall;

    const serviceId = req.params.serviceId || req.body.serviceId;

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
