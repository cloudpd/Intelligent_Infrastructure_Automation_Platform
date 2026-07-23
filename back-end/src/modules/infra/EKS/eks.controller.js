const eksService = require('./eks.service');

async function createCluster(req, res, next) {
  try {
    const cluster = await eksService.createCluster(req.user.id, req.params.serviceId, req.body);
    res.status(201).json({ success: true, data: cluster });
  } catch (err) {
    next(err);
  }
}

async function listClusters(req, res, next) {
  try {
    const clusters = await eksService.listClusters(req.user.id, req.params.serviceId);
    res.json({ success: true, data: clusters });
  } catch (err) {
    next(err);
  }
}

async function getCluster(req, res, next) {
  try {
    const cluster = await eksService.getCluster(req.user.id, req.params.clusterId);
    res.json({ success: true, data: cluster });
  } catch (err) {
    next(err);
  }
}

async function updateCluster(req, res, next) {
  try {
    const cluster = await eksService.updateCluster(req.user.id, req.params.clusterId, req.body);
    res.json({ success: true, data: cluster });
  } catch (err) {
    next(err);
  }
}

async function deleteCluster(req, res, next) {
  try {
    await eksService.deleteCluster(req.user.id, req.params.clusterId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** Preview what the Terraform generator would receive, without actually generating files. */
async function getGeneratorConfig(req, res, next) {
  try {
    const config = await eksService.getGeneratorConfig(req.user.id, req.params.clusterId);
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCluster,
  listClusters,
  getCluster,
  updateCluster,
  deleteCluster,
  getGeneratorConfig,
};
