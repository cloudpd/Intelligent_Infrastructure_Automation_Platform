
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

  return '';
}
module.exports = { generateOutputsTf };
