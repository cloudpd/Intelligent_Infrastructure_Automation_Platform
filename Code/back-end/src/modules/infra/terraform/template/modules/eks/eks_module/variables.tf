variable "vpc_id" { # take it from network module in main.tf
  type = string 
}
variable "cluster_name" {
    type = string
}
variable "cluster_version" {
  type = string
}

variable "subnet_ids_list" {
  type = list(string)
}


# list of nodes groups
variable "node_groups" {
  description = "Map of node group configurations"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    desired_size   = number
    min_size       = number
    max_size       = number
    disk_size      = number

    # labels         = map(string) # if you want add labels to your ec2 in node group you can add it here
    # taints = list(object({ # if you want add taint to your ec2 in node group you can add it here
    #   key    = string
    #   value  = string
    #   effect = string
    # }))
  }))
}

# private subnet list # give her to node group , i can make loop on all subnets id list but correct to produce this output from network module
variable "private_subnet_ids_list" {
  type = list(string)
}

