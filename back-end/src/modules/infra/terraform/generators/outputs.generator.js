
function generateOutputsTf(type) {
  if (type === 'network') {
    return `
output "vpc_id" {

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

  }

  if (type === 'ecr') {
    return `
output "ecr_repository_url" {
  value = module.ecr.repository_url

}

output "ecr_repository_arn" {
  value = module.ecr.repository_arn
}

output "ecr_registry_id" {
  value = module.ecr.registry_id
}
`;
  }

  if (type === 'eks') {
    return `
output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_cluster_certificate_authority_data" {
  value = module.eks.cluster_certificate_authority_data
}

output "eks_oidc_provider_url" {
  value = module.eks.oidc_provider_url
}

output "eks_oidc_provider_arn" {
  value = module.eks.oidc_provider_arn
}
`;
  }

  return '';
}
module.exports = { generateOutputsTf };
