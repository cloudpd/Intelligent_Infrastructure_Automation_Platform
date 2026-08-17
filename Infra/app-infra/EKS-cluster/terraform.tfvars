cluster_name    = "gp-cluster"
cluster_version = "1.35"

vpc_cidr = "10.100.0.0/16"

region = "eu-north-1"

subnet_variables_list = [{
  name        = "private_subnet_1", # private or public & use this as condition also not just in name
  subnet_cidr = "10.100.1.0/24",    # 
  AZ_letters  = "a",                # region +(a,b,c)
  type        = "private"           # private or public # to make condition of allow public ip or not
  },
  {
    name        = "private_subnet_2",
    subnet_cidr = "10.100.2.0/24",
    AZ_letters  = "b",
    type        = "private"
  },
  {
    name        = "private_subnet_3",
    subnet_cidr = "10.100.3.0/24",
    AZ_letters  = "c",
    type        = "private"
  },
  {
    name        = "public_subnet_1",
    subnet_cidr = "10.100.4.0/24",
    AZ_letters  = "a",
    type        = "public"
  },
  {
    name        = "public_subnet_2",
    subnet_cidr = "10.100.5.0/24",
    AZ_letters  = "b",
    type        = "public"
  },
  {
    name        = "public_subnet_3",
    subnet_cidr = "10.100.6.0/24",
    AZ_letters  = "c",
    type        = "public"
  }
]






node_groups = {
  # i made one node group for general workloads but you can make multiple node groups
  # On-demand for critical workloads
  general = {
    # instance_types = ["t3.medium"]
    instance_types = ["c7i-flex.large"]
    capacity_type  = "ON_DEMAND"
    desired_size   = 2
    min_size       = 1
    max_size       = 4
    disk_size      = 20

  }



}



names_of_users_cluster_admins = [
  {
    user_name       = "GP"
    user_account_id = "997206200726"
    cluster_name    = "gp-cluster"
  }
  # ,
  # {
  #   user_name       = "gitlab-deployer"
  #   user_account_id = "767196576807"
  #   cluster_name    = "youssef-cluster"
  # }
]



