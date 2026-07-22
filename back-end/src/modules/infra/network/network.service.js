const AppError = require('../../../core/utils/AppError');
const { Service } = require('../../service/service.model');
const { Network } = require('./network.model');

/* ---------- CIDR math ---------- */
const ipToInt = (ip) => ip.split('.').reduce((acc, o) => (acc << 8) + parseInt(o, 10), 0) >>> 0;
const intToIp = (int) =>
  [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');

const parseCidr = (cidrStr) => {
  const [ip, prefixStr] = cidrStr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const base = ipToInt(ip);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return { network: (base & mask) >>> 0, broadcast: (base | (~mask >>> 0)) >>> 0, prefix };
};

const isSubsetOf = (inner, outer) => {
  const a = parseCidr(inner), b = parseCidr(outer);
  return a.network >= b.network && a.broadcast <= b.broadcast && a.prefix >= b.prefix;
};

const overlaps = (a, b) => {
  const x = parseCidr(a), y = parseCidr(b);
  return x.network <= y.broadcast && y.network <= x.broadcast;
};

function generateSubnetCidrs(vpcCidr, count, startIndex, newPrefix = 24) {
  const [baseIp] = vpcCidr.split('/');
  const baseInt = ipToInt(baseIp);
  const blockSize = Math.pow(2, 32 - newPrefix);
  const subnets = [];
  for (let i = 0; i < count; i++) {
    subnets.push(`${intToIp(baseInt + (startIndex + i) * blockSize)}/${newPrefix}`);
  }
  return subnets;
}

/** Resolves final CIDRs for one subnet group: use provided ones (validated) or auto-generate. */
function resolveSubnetGroup(vpcCidr, group, autoStartIndex) {
  if (!group.enabled || group.count === 0) return [];

  const cidrs = group.cidrs && group.cidrs.length > 0
    ? group.cidrs
    : generateSubnetCidrs(vpcCidr, group.count, autoStartIndex);

  for (const c of cidrs) {
    if (!isSubsetOf(c, vpcCidr)) {
      throw new AppError(`Subnet CIDR ${c} is not contained within VPC CIDR ${vpcCidr}`, 422);
    }
  }
  for (let i = 0; i < cidrs.length; i++) {
    for (let j = i + 1; j < cidrs.length; j++) {
      if (overlaps(cidrs[i], cidrs[j])) {
        throw new AppError(`Subnet CIDRs ${cidrs[i]} and ${cidrs[j]} overlap`, 409);
      }
    }
  }
  return cidrs;
}

/**
 * Generates AZ names (e.g. us-east-1a, us-east-1b, ...) from the counts the
 * user sent (publicSubnets.count / privateSubnets.count on the request).
 * The user never sends AZ names — only numbers — the backend fills in the
 * actual list here, once, at creation time, and it gets persisted on the
 * Network row from there.
 */
function resolveAvailabilityZones(region, publicSubnets, privateSubnets) {
  const azCount = Math.max(
    publicSubnets.enabled ? publicSubnets.count : 0,
    privateSubnets.enabled ? privateSubnets.count : 0
  );
  return Array.from({ length: azCount }, (_, i) => `${region}${String.fromCharCode(97 + i)}`);
}

async function getOwnedService(serviceId, userId) {
  const service = await Service.findOne({ where: { id: serviceId, owner_id: userId } });
  if (!service) throw new AppError('Service not found', 404);
  return service;
}

async function getOwnedVpc(vpcId, userId) {
  const network = await Network.findOne({
    where: { id: vpcId },
    include: [{ model: Service, as: 'service', where: { owner_id: userId }, attributes: [] }],
  });
  if (!network) throw new AppError('VPC not found', 404);
  return network;
}

async function createVpc(userId, serviceId, data) {
  await getOwnedService(serviceId, userId);

  const publicCidrs = resolveSubnetGroup(data.cidr, data.publicSubnets, 1);
  const privateCidrs = resolveSubnetGroup(data.cidr, data.privateSubnets, 11);

  // cross-group overlap check (public block vs private block)
  for (const p of publicCidrs) {
    for (const pr of privateCidrs) {
      if (overlaps(p, pr)) {
        throw new AppError(`Public subnet ${p} overlaps private subnet ${pr}`, 409);
      }
    }
  }

  return Network.create({
    service_id: serviceId,
    name: data.name,
    description: data.description,
    region: data.region,
    vpc_cidr: data.cidr,
    availability_zones: resolveAvailabilityZones(data.region, data.publicSubnets, data.privateSubnets),
    public_subnets: { enabled: data.publicSubnets.enabled, cidrs: publicCidrs },
    private_subnets: { enabled: data.privateSubnets.enabled, cidrs: privateCidrs },
    nat_gateway: data.natGateway,
    internet_gateway: data.internetGateway,
    enable_dns_support: data.enableDnsSupport,
    enable_dns_hostnames: data.enableDnsHostnames,
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
  return network.update(data);
}

async function deleteVpc(userId, vpcId) {
  const network = await getOwnedVpc(vpcId, userId);
  await network.destroy();
}

/**
 * Shapes one Network row into exactly what the Terraform generator needs.
 * This is the contract between this module and terraform.service.js.
 */
function toGeneratorConfig(network, { serviceSlug, environment }) {
  return {
    name: network.name,
    region: network.region,
    cidr: network.vpc_cidr,
    azs: network.availability_zones,
    publicSubnetCidrs: network.public_subnets.cidrs,
    privateSubnetCidrs: network.private_subnets.cidrs,
    natGateway: network.nat_gateway,
    internetGateway: network.internet_gateway,
    enableDnsSupport: network.enable_dns_support,
    enableDnsHostnames: network.enable_dns_hostnames,
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
  // exported for unit testing
  generateSubnetCidrs,
  isSubsetOf,
  overlaps,
};