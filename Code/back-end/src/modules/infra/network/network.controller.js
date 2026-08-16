    const networkService = require('./network.service');

    async function createVpc(req, res, next) {
      try {
        const vpc = await networkService.createVpc(req.user.id, req.params.serviceId, req.body);
        res.status(201).json({ success: true, data: vpc });
      } catch (err) {
        next(err);
      }
    }

    async function listVpcs(req, res, next) {
      try {
        const vpcs = await networkService.listVpcs(req.user.id, req.params.serviceId);
        res.json({ success: true, data: vpcs });
      } catch (err) {
        next(err);
      }
    }

    async function getVpc(req, res, next) {
      try {
        const vpc = await networkService.getVpc(req.user.id, req.params.vpcId);
        res.json({ success: true, data: vpc });
      } catch (err) {
        next(err);
      }
    }

    async function updateVpc(req, res, next) {
      try {
        const vpc = await networkService.updateVpc(req.user.id, req.params.vpcId, req.body);
        res.json({ success: true, data: vpc });
      } catch (err) {
        next(err);
      }
    }

    async function deleteVpc(req, res, next) {
      try {
        await networkService.deleteVpc(req.user.id, req.params.vpcId);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    }

    /** Preview what the Terraform generator would receive, without actually generating files. */
    async function getGeneratorConfig(req, res, next) {
      try {
        const config = await networkService.getGeneratorConfig(req.user.id, req.params.vpcId, {
          serviceSlug: req.query.serviceSlug || 'service',
          environment: req.query.environment || 'dev',
        });
        res.json({ success: true, data: config });
      } catch (err) {
        next(err);
      }
    }

    module.exports = { createVpc, listVpcs, getVpc, updateVpc, deleteVpc, getGeneratorConfig };