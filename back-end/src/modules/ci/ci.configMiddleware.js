const { validateCIConfig } = require('./ci.validation');
const AppError = require('../../core/utils/AppError');


 
function validateCIConfigMiddleware(req, res, next) {
  try {
    const {
      pipelineName,
      triggerBranch,
      registry,
      imageName,
      enableTrivy,
      awsEcrRegion,
    } = req.body;

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
      awsEcrRegion,
    };

    req.ciConfig = validateCIConfig(configData);

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = validateCIConfigMiddleware;
