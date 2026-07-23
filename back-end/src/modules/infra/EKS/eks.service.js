const AppError = require('../../../core/utils/AppError');
const { encrypt, decrypt } = require('../../../core/utils/encryption');
const { Service } = require('../../service/service.model');
const { Project } = require('../../projects/projects.model');
const { Network } = require('../network/network.model');
const { EksCluster } = require('./eks.model');

/** Verify the service exists and is owned by this user (via project → owner_id). */
async function getOwnedService(serviceId, userId) {
  const service = await Service.findOne({
    where: { id: serviceId },
    include: [{ model: Project, as: 'project', where: { owner_id: userId }, attributes: [] }],
  });
  if (!service) throw new AppError('Service not found', 404);
  return service;
}

async function getOwnedCluster(clusterId, userId) {
  const cluster = await EksCluster.findOne({
    where: { id: clusterId },
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
  if (!cluster) throw new AppError('EKS cluster not found', 404);
  return cluster;
}

/**
 * An EKS cluster can never be generated without a Network module for the
 * same service — the eks module has no way to build its own VPC (see
 * main.generator.js). Enforced here, at creation time, rather than only
 * discovered later at Terraform-generation time.
 */
async function assertNetworkExists(serviceId) {
  const network = await Network.findOne({ where: { service_id: serviceId } });
  if (!network) {
    throw new AppError('This service has no Network module yet — create one before adding an EKS cluster', 422);
  }
  return network;
}

function toNodeGroupsColumn(nodeGroups) {
  // DB column stores snake_case keys to match the Terraform variable shape
  // 1:1, so toGeneratorConfig() below is a pure passthrough with no
  // reshaping surprises.
  const out = {};
  for (const [name, group] of Object.entries(nodeGroups)) {
    out[name] = {
      instance_types: group.instanceTypes,
      capacity_type: group.capacityType,
      desired_size: group.desiredSize,
      min_size: group.minSize,
      max_size: group.maxSize,
      disk_size: group.diskSize,
    };
  }
  return out;
}

async function createCluster(userId, serviceId, data) {
  await getOwnedService(serviceId, userId);
  await assertNetworkExists(serviceId);

  const existing = await EksCluster.findOne({ where: { service_id: serviceId } });
  if (existing) {
    throw new AppError('This service already has an EKS cluster', 409);
  }

  return EksCluster.create({
    service_id: serviceId,
    cluster_name: data.clusterName,
    cluster_version: data.clusterVersion,
    region: data.region,
    node_groups: toNodeGroupsColumn(data.nodeGroups),
    cluster_admins: data.clusterAdmins.map((a) => ({
      user_name: a.userName,
      user_account_id: a.userAccountId,
    })),
    grafana_admin_password_encrypted: encrypt(data.grafanaAdminPassword),
    enable_ebs_csi: data.enableEbsCsi,
    enable_alb_controller: data.enableAlbController,
    enable_external_dns: data.enableExternalDns,
    enable_external_secrets: data.enableExternalSecrets,
  });
}

async function listClusters(userId, serviceId) {
  await getOwnedService(serviceId, userId);
  return EksCluster.findAll({ where: { service_id: serviceId } });
}

async function getCluster(userId, clusterId) {
  return getOwnedCluster(clusterId, userId);
}

async function updateCluster(userId, clusterId, data) {
  const cluster = await getOwnedCluster(clusterId, userId);

  const patch = {};
  if (data.clusterVersion !== undefined) patch.cluster_version = data.clusterVersion;
  if (data.nodeGroups !== undefined) patch.node_groups = toNodeGroupsColumn(data.nodeGroups);
  if (data.clusterAdmins !== undefined) {
    patch.cluster_admins = data.clusterAdmins.map((a) => ({
      user_name: a.userName,
      user_account_id: a.userAccountId,
    }));
  }
  if (data.grafanaAdminPassword !== undefined) {
    patch.grafana_admin_password_encrypted = encrypt(data.grafanaAdminPassword);
  }
  if (data.enableEbsCsi !== undefined) patch.enable_ebs_csi = data.enableEbsCsi;
  if (data.enableAlbController !== undefined) patch.enable_alb_controller = data.enableAlbController;
  if (data.enableExternalDns !== undefined) patch.enable_external_dns = data.enableExternalDns;
  if (data.enableExternalSecrets !== undefined) patch.enable_external_secrets = data.enableExternalSecrets;

  return cluster.update(patch);
}

async function deleteCluster(userId, clusterId) {
  const cluster = await getOwnedCluster(clusterId, userId);
  await cluster.destroy();
}

/**
 * Shapes one EksCluster row into exactly what the Terraform generator
 * (terraform.service.js / snippets/eks.hbs) needs. This is the contract
 * between this module and terraform.service.js — mirrors
 * network.service.js#toGeneratorConfig.
 *
 * Deliberately does NOT include vpc_id / subnet ids / anything networking —
 * those only ever come from module.network.* references baked into
 * eks.hbs, never from this config object.
 */
function toGeneratorConfig(cluster) {
  const nodeGroups = {};
  for (const [name, group] of Object.entries(cluster.node_groups)) {
    nodeGroups[name] = {
      instanceTypes: group.instance_types,
      capacityType: group.capacity_type,
      desiredSize: group.desired_size,
      minSize: group.min_size,
      maxSize: group.max_size,
      diskSize: group.disk_size,
    };
  }

  return {
    clusterName: cluster.cluster_name,
    clusterVersion: cluster.cluster_version,
    region: cluster.region,
    nodeGroups,
    clusterAdmins: cluster.cluster_admins.map((a) => ({
      userName: a.user_name,
      userAccountId: a.user_account_id,
    })),
    grafanaAdminPassword: decrypt(cluster.grafana_admin_password_encrypted),
    enableEbsCsi: cluster.enable_ebs_csi,
    enableAlbController: cluster.enable_alb_controller,
    enableExternalDns: cluster.enable_external_dns,
    enableExternalSecrets: cluster.enable_external_secrets,
  };
}

async function getGeneratorConfig(userId, clusterId) {
  const cluster = await getOwnedCluster(clusterId, userId);
  return toGeneratorConfig(cluster);
}

module.exports = {
  createCluster,
  listClusters,
  getCluster,
  updateCluster,
  deleteCluster,
  getGeneratorConfig,
  toGeneratorConfig,
};
