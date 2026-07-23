const AppError = require('../../../core/utils/AppError');
const { Service } = require('../../service/service.model');
const { Project } = require('../../projects/projects.model');
const { Network } = require('./network.model');



async function getOwnedService(serviceId, userId) {
  const service = await Service.findOne({
    where: { id: serviceId },
    include: [{ model: Project, as: 'project', where: { owner_id: userId }, attributes: [] }],
  });
  if (!service) throw new AppError('Service not found', 404);
  return service;
}

async function getOwnedVpc(vpcId, userId) {
  const network = await Network.findOne({
    where: { id: vpcId },
    include: [
      {
        model: Service,
        as: 'service',
        required: true,
        attributes: [],
        include: [{ model: Project, as: 'project', where: { owner_id: userId }, attributes: [] }],
      },
    ],
  });
  if (!network) throw new AppError('VPC not found', 404);
  return network;
}

async function createVpc(userId, serviceId, data) {
  await getOwnedService(serviceId, userId);
  return Network.create({
    service_id: serviceId,
    name: data.name,
    region: data.region,
    cidr: data.cidr,
  });
}

async function listVpcs(userId, serviceId) {
  await getOwnedService(serviceId, userId);
  return Network.findAll({ where: { service_id: serviceId } });
}

async function getVpc(userId, vpcId) {
  return getOwnedVpc(vpcId, userId);
}

async function updateVpc(userId, vpcId, data) {
  const network = await getOwnedVpc(vpcId, userId);
  if (network.status === 'applied') {
    throw new AppError(
      'This network has already been applied to real infrastructure. Create a new revision instead of editing it.',
      422
    );
  }
  return network.update(data);
}

async function deleteVpc(userId, vpcId) {
  const network = await getOwnedVpc(vpcId, userId);
  if (network.status === 'applied') {
    throw new AppError('Cannot delete a network with applied infrastructure. Destroy it via Terraform first.', 422);
  }
  await network.destroy();
}

function toGeneratorConfig(network, { serviceSlug, environment }) {
  return {
    name: network.name,
    region: network.region,
    cidr: network.cidr,
    serviceSlug,
    environment,
  };
}

async function getGeneratorConfig(userId, vpcId, { serviceSlug, environment }) {
  const network = await getOwnedVpc(vpcId, userId);
  return toGeneratorConfig(network, { serviceSlug, environment });
}

module.exports = {
  createVpc,
  listVpcs,
  getVpc,
  updateVpc,
  deleteVpc,
  getGeneratorConfig,
};