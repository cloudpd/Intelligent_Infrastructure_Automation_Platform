variable "region" {
  type = string
}

variable "cluster_name" {
  type = string
}
variable "cluster_version" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "subnet_variables_list" {
  type = list(object({
    name        = string, # private-subnet1 or public-subnet1 , private-subnet2 or public-subnet2
    subnet_cidr = string, # 
    AZ_letters  = string, # region +(a,b,c)
    type        = string  # private or public # to make condition of allow public ip or not
  }))
}

variable "node_groups" {
  description = "Map of node group configurations"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    desired_size   = number
    min_size       = number
    max_size       = number
    disk_size      = number
  }))
}




variable "names_of_users_cluster_admins" {
  type = list(object({
    user_name       = string
    user_account_id = string
    cluster_name    = string
  }))
}


