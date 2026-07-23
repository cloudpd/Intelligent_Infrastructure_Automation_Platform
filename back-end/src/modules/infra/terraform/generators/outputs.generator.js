<<<<<<< HEAD
function generateOutputsTf(type) {
  if (type === 'network') {
    return `
output "vpc_id" {
=======
/**
 * Root outputs.tf. Calling generateOutputsTf() with no arguments (the
 * pre-EKS call shape) returns byte-for-byte the same output as before.
 */
function generateOutputsTf({ eksEnabled } = {}) {
  let out = `output "vpc_id" {
>>>>>>> a420867 (add terraform not complete)
  value = module.network.vpc_id
}

output "public_subnet_ids" {
  value = module.network.public_subnet_ids
}

output "private_subnet_ids" {
  value = module.network.private_subnet_ids
}

output "nat_public_ips" {
  value = module.network.nat_public_ips
}
`;
<<<<<<< HEAD
  }

  if (type === 'ecr') {
    return `
output "ecr_repository_url" {
  value = module.ecr.repository_url
=======

  if (eksEnabled) {
    out += `
output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_oidc_provider_arn" {
  value = module.eks.oidc_provider_arn
}
`;
  }

  return out;
>>>>>>> a420867 (add terraform not complete)
}

output "ecr_repository_arn" {
  value = module.ecr.repository_arn
}

output "ecr_registry_id" {
  value = module.ecr.registry_id
}
`;
  }

  return '';
}
module.exports = { generateOutputsTf };
