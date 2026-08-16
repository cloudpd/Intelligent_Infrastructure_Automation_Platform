const vmService = require('./vm.service');

async function createVm(req, res, next) {
  try {
    const vm = await vmService.createVm(req.user.id, req.params.serviceId, req.body);
    res.status(201).json({ success: true, data: vm });
  } catch (err) {
    next(err);
  }
}

async function listVms(req, res, next) {
  try {
    const vms = await vmService.listVms(req.user.id, req.params.serviceId);
    res.json({ success: true, data: vms });
  } catch (err) {
    next(err);
  }
}

async function getVm(req, res, next) {
  try {
    const vm = await vmService.getVm(req.user.id, req.params.vmId);
    res.json({ success: true, data: vm });
  } catch (err) {
    next(err);
  }
}

async function updateVm(req, res, next) {
  try {
    const vm = await vmService.updateVm(req.user.id, req.params.vmId, req.body);
    res.json({ success: true, data: vm });
  } catch (err) {
    next(err);
  }
}

async function deleteVm(req, res, next) {
  try {
    await vmService.deleteVm(req.user.id, req.params.vmId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getGeneratorConfig(req, res, next) {
  try {
    const config = await vmService.getGeneratorConfig(req.user.id, req.params.vmId, {
      serviceSlug: req.query.serviceSlug || 'service',
      environment: req.query.environment || 'dev',
    });
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

module.exports = { createVm, listVms, getVm, updateVm, deleteVm, getGeneratorConfig };