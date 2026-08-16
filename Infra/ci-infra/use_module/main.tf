# in main.tf collect module i used and give its values and start use them in my code(resources)
module "network" {
  source = "../modules/network_module" # now ask you for variables values to use this module

  subnet_variables_list = var.subnet_variables_list # this take its value from .tfvars
  region                = var.region                # this take its value from .tfvars
  vpc_cidr              = var.vpc_cidr              # this take its value from .tfvars  
}

module "ci-resources" {
  source = "../modules/ci_resources_module"


  vpc_id = module.network.NM_vpc_id
  # get the values from the map returned from network module
  # the values are subnets and from each subnet make list of ids 
  list_public_subnets_ids = [
    for subnet in values(module.network.NM_public_subnets) :
    subnet.id
  ]

  list_private_subnets_ids = [
    for subnet in values(module.network.NM_private_subnets) :
    subnet.id
  ]

  dict_private_subnets = module.network.NM_private_subnets
}