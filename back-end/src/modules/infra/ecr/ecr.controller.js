const ecrService = require('./ecr.service');

async function createRepo(req, res, next) {
  try {
    const repo = await ecrService.createRepo(req.user.id, req.params.serviceId, req.body);
    res.status(201).json({ success: true, data: repo });
  } catch (err) {
    next(err);
  }
}

async function listRepos(req, res, next) {
  try {
    const repos = await ecrService.listRepos(req.user.id, req.params.serviceId);
    res.json({ success: true, data: repos });
  } catch (err) {
    next(err);
  }
}

async function getRepo(req, res, next) {
  try {
    const repo = await ecrService.getRepo(req.user.id, req.params.repoId);
    res.json({ success: true, data: repo });
  } catch (err) {
    next(err);
  }
}

async function updateRepo(req, res, next) {
  try {
    const repo = await ecrService.updateRepo(req.user.id, req.params.repoId, req.body);
    res.json({ success: true, data: repo });
  } catch (err) {
    next(err);
  }
}

async function deleteRepo(req, res, next) {
  try {
    await ecrService.deleteRepo(req.user.id, req.params.repoId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** Preview what the Terraform generator would receive, without generating files. */
async function getGeneratorConfig(req, res, next) {
  try {
    const config = await ecrService.getGeneratorConfig(req.user.id, req.params.repoId, {
      serviceSlug: req.query.serviceSlug || 'service',
      environment: req.query.environment || 'dev',
    });
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

module.exports = { createRepo, listRepos, getRepo, updateRepo, deleteRepo, getGeneratorConfig };
