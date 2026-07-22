# Thin wrapper around the official registry module. Your platform code only
# ever references `module "network"` with these simple inputs — if you ever
# need to swap the implementation (e.g. hand-rolled resources again), only
# this file changes, not the generator or the DB schema.
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = var.name
  cidr = var.cidr
  azs  = var.azs

  public_subnets  = var.public_subnet_cidrs
  private_subnets = var.private_subnet_cidrs

  create_igw = var.internet_gateway

  enable_nat_gateway     = var.nat_gateway_strategy != "none"
  single_nat_gateway     = var.nat_gateway_strategy == "single"
  one_nat_gateway_per_az = var.nat_gateway_strategy == "one_per_az"

  enable_dns_support   = var.enable_dns_support
  enable_dns_hostnames = var.enable_dns_hostnames

  tags = var.tags
}
