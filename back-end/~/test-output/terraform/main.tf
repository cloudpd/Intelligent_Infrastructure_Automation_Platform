module "network" {
  source = "./modules/network"

  name   = "test-vpc"
  region = "us-east-1"
  cidr   = "10.0.0.0/16"
}
