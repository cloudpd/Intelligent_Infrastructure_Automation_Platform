const AppError = require('../../../core/utils/AppError');
const { Service } = require('../../service/service.model');
const { Project } = require('../../projects/projects.model');
const { Network } = require('../network/network.model');
const { VmDeployment } = require('./vm.model');

async function getOwnedService(serviceId, userId) {
  const service = await Service.findOne({
    where: { id: serviceId },
    include: [{ model: Project, as: 'project', where: { owner_id: userId }, attributes: [] }],
  });
  if (!service) throw new AppError('Service not found', 404);
  return service;
}

async function getOwnedVm(vmId, userId) {
  const vm = await VmDeployment.findOne({
    where: { id: vmId },
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
  if (!vm) throw new AppError('VM deployment not found', 404);
  return vm;
}

/**
 * A VM deployment can never be generated without a Network module for the
 * same service — same reasoning as EksCluster#assertNetworkExists: the VM
 * needs a subnet to actually launch into, which only the network module
 * produces (see vm.hbs's literal module.network.* references).
 */
async function assertNetworkExists(serviceId) {
  const network = await Network.findOne({ where: { service_id: serviceId } });
  if (!network) {
    throw new AppError('This service has no Network module yet — create one before adding a VM deployment', 422);
  }
  return network;
}

async function createVm(userId, serviceId, data) {
  await getOwnedService(serviceId, userId);
  await assertNetworkExists(serviceId);

  const existing = await VmDeployment.findOne({ where: { service_id: serviceId } });
  if (existing) {
    throw new AppError('This service already has a VM deployment', 409);
  }

  return VmDeployment.create({
    service_id: serviceId,
    name: data.name,
    region: data.region,
    instance_type: data.instance_type,
    kind_cluster_name: data.kind_cluster_name,
    container_port: data.container_port,
    host_port: data.host_port,
    allow_ssh: data.allow_ssh,
  });
}

async function listVms(userId, serviceId) {
  await getOwnedService(serviceId, userId);
  return VmDeployment.findAll({ where: { service_id: serviceId } });
}

async function getVm(userId, vmId) {
  return getOwnedVm(vmId, userId);
}

async function updateVm(userId, vmId, data) {
  const vm = await getOwnedVm(vmId, userId);
  if (vm.status === 'applied') {
    throw new AppError(
      'This VM has already been applied to real infrastructure. Create a new revision instead of editing it.',
      422
    );
  }
  return vm.update(data);
}

async function deleteVm(userId, vmId) {
  const vm = await getOwnedVm(vmId, userId);
  if (vm.status === 'applied') {
    throw new AppError('Cannot delete a VM with applied infrastructure. Destroy it via Terraform first.', 422);
  }
  await vm.destroy();
}

/**
 * Shapes one VmDeployment row into exactly what the Terraform generator
 * (terraform.service.js / snippets/vm.hbs) needs — mirrors
 * eks.service.js#toGeneratorConfig / network.service.js#toGeneratorConfig.
 *
 * Deliberately does NOT include subnet_id/vpc_id — those only ever come
 * from module.network.* references baked into vm.hbs, never from here.
 */
function toGeneratorConfig(vm, { serviceSlug, environment }) {
  return {
    name: vm.name,
    region: vm.region,
    instanceType: vm.instance_type,
    kindClusterName: vm.kind_cluster_name,
    containerPort: vm.container_port,
    hostPort: vm.host_port,
    allowSsh: vm.allow_ssh,
    serviceSlug,
    environment,
  };
}

async function getGeneratorConfig(userId, vmId, { serviceSlug, environment }) {
  const vm = await getOwnedVm(vmId, userId);
  return toGeneratorConfig(vm, { serviceSlug, environment });
}

module.exports = {
  createVm,
  listVms,
  getVm,
  updateVm,
  deleteVm,
  getGeneratorConfig,
  toGeneratorConfig,
};