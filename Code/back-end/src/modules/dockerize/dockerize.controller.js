const dockerizeService = require('./dockerize.service');
const { getDefaultsForLanguage } = require('./dockerize.templates');

async function markExistingController(req, res, next) {
  try {
    const config = await dockerizeService.markExistingDockerfile(req.user.id, req.body);
    res.status(200).json({ success: true, buildConfig: config });
  } catch (err) {
    next(err);
  }
}

async function getLanguageDefaultsController(req, res, next) {
  try {
    const { language } = req.params;
    const defaults = getDefaultsForLanguage(language);
    res.status(200).json({ success: true, defaults });
  } catch (err) {
    next(err);
  }
}

async function generateController(req, res, next) {
  try {
    const config = await dockerizeService.generateAndPushDockerfile(req.user.id, req.body);
    res.status(201).json({ success: true, buildConfig: config });
  } catch (err) {
    next(err);
  }
}

async function getBuildConfigController(req, res, next) {
  try {
    const { serviceId } = req.params;
    const config = await dockerizeService.getBuildConfigForService(req.user.id, serviceId);
    res.status(200).json({ success: true, buildConfig: config });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  markExistingController,
  getLanguageDefaultsController,
  generateController,
  getBuildConfigController,
};