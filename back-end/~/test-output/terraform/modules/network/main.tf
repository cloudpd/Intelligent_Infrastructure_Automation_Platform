
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  az                = [data.aws_availability_zones.available.names[0]]
  public_subnet_cidr  = [cidrsubnet(var.cidr, 8, 1)]
  private_subnet_cidr = [cidrsubnet(var.cidr, 8, 11)]
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = var.name
  cidr = var.cidr
  azs  = local.az

  public_subnets  = local.public_subnet_cidr
  private_subnets = local.private_subnet_cidr

  create_igw = true

  enable_nat_gateway = true
  single_nat_gateway = true

  enable_dns_support   = true
  enable_dns_hostnames = true
}
