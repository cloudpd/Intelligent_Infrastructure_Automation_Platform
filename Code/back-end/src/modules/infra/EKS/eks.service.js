const AppError = require('../../../core/utils/AppError');
const { encrypt, decrypt } = require('../../../core/utils/encryption');
const { Service } = require('../../service/service.model');
const { Project } = require('../../projects/projects.model');
const { Network } = require('../network/network.model');
const { VmDeployment } = require('../vm/vm.model');
const { EksCluster } = require('./eks.model');
const { pushRepoSecrets, parseRepoUrl } = require('../../github/github.service');

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

/**
 * A service may run its container on EKS OR on a VM (via a KIND cluster),
 * never both — same reasoning as vm.service.js#assertNoEksCluster, from
 * the other side: two competing compute answers to "where does this
 * service actually run" would leave generateServiceFiles no way to pick
 * a winner between them.
 */
async function assertNoVmDeployment(serviceId) {
  const vm = await VmDeployment.findOne({ where: { service_id: serviceId } });
  if (vm) {
    throw new AppError(
      'This service already has a VM deployment. A service can only use one compute option — VM or EKS, not both. Delete the VM deployment first if you want to switch to EKS.',
      409
    );
  }
}

/**
 * Pushes the cluster's name and region to the service's GitHub repo as
 * Actions secrets (EKS_CLUSTER_NAME / AWS_REGION), via the existing
 * pushRepoSecrets() from the github module. Best-effort: a GitHub/PAT
 * failure here must not undo the EKS cluster row we already committed to
 * the DB (the cluster is still real infra config either way), so we catch
 * and attach the failure to the returned cluster instead of throwing.
 */
async function syncClusterSecretsToGithub(userId, serviceId, cluster, repositoryUrl) {
  // repoFullName is derived locally (not returned by pushRepoSecrets) purely
  // so the caller/UI can say *which* repo got the secrets.
  let repoFullName = null;
  try {
    const { owner, repo } = parseRepoUrl(repositoryUrl);
    repoFullName = `${owner}/${repo}`;
  } catch {
    // Malformed repository_url — pushRepoSecrets will hit the same problem
    // and report it below; repoFullName just stays null.
  }

  try {
    await pushRepoSecrets({
      userId,
      serviceId,
      secrets: {
        EKS_CLUSTER_NAME: cluster.cluster_name,
        AWS_REGION: cluster.region,
      },
    });
    return { synced: true, repoFullName, secretNames: ['EKS_CLUSTER_NAME', 'AWS_REGION'] };
  } catch (err) {
    return { synced: false, repoFullName, error: err.message };
  }
}

async function createCluster(userId, serviceId, data) {
  const service = await getOwnedService(serviceId, userId);
  await assertNetworkExists(serviceId);
  await assertNoVmDeployment(serviceId);

  const existing = await EksCluster.findOne({ where: { service_id: serviceId } });
  if (existing) {
    throw new AppError('This service already has an EKS cluster', 409);
  }

  const cluster = await EksCluster.create({
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

  const githubSync = await syncClusterSecretsToGithub(userId, serviceId, cluster, service.repository_url);

  return { ...cluster.toJSON(), githubSync };
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

  // clusterName/region can only change while the cluster is still just a
  // DB record with no real AWS resources behind it yet. Once apply has
  // started or finished, changing these would desync Terraform state from
  // whatever's actually running in AWS (orphaning the old cluster instead
  // of updating it) — so recreate (delete + create) is required instead.
  const changingIdentity = data.clusterName !== undefined || data.region !== undefined;
  if (changingIdentity && (cluster.status === 'applied' || cluster.status === 'applying')) {
    throw new AppError(
      'clusterName and region cannot be changed once the cluster has been applied — delete this cluster and create a new one instead.',
      409
    );
  }

  const patch = {};
  if (data.clusterName !== undefined) patch.cluster_name = data.clusterName;
  if (data.region !== undefined) patch.region = data.region;
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

async function markApplying(clusterId) {
  await EksCluster.update({ status: 'applying', apply_error: null }, { where: { id: clusterId } });
}

async function markApplied(clusterId, { clusterEndpoint, clusterName }) {
  await EksCluster.update(
    {
      status: 'applied',
      cluster_endpoint: clusterEndpoint,
      cluster_name: clusterName,
    },
    { where: { id: clusterId } }
  );
}

async function markFailed(clusterId, errorMessage) {
  await EksCluster.update({ status: 'failed', apply_error: errorMessage }, { where: { id: clusterId } });
}

async function deleteByServiceId(serviceId) {
  await EksCluster.destroy({ where: { service_id: serviceId } });
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

/**
 * Looks up the EksCluster row by service_id rather than by the record's
 * own id — used by the unified /infra/terraform/services/:serviceId/generate
 * endpoint to check whether an EKS cluster has been configured (written to
 * the DB) for this service at all. Returns null rather than throwing when
 * none exists — EKS is optional per service, so "not configured yet" just
 * means the caller skips rendering the eks module, it isn't an error.
 */
async function getGeneratorConfigForService(userId, serviceId) {
  await getOwnedService(serviceId, userId);
  const cluster = await EksCluster.findOne({ where: { service_id: serviceId } });
  if (!cluster) return null;
  return toGeneratorConfig(cluster);
}

module.exports = {
  createCluster,
  listClusters,
  getCluster,
  updateCluster,
  deleteCluster,
  getGeneratorConfig,
  getGeneratorConfigForService,
  toGeneratorConfig,
  getOwnedCluster,
  markApplying,
  markApplied,
  markFailed,
  deleteByServiceId,
};