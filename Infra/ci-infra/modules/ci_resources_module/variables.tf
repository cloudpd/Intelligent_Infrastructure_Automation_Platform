variable "vpc_id" {
  type = string
}
variable "bastion_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "ci_master_instance_type" {
  type    = string
  default = "c7i-flex.large"
}

variable "ci_agent_instance_type" {
  type    = string
  default = "c7i-flex.large"
}

variable "ci_agent_count" {
  type    = number
  default = 2

}

variable "list_public_subnets_ids" {
  type = list(string)
}

variable "list_private_subnets_ids" {
  type = list(string)
}

variable "dict_private_subnets" {
  type= map(any)
}

#   list_public_subnets_ids_ALB = [
#     aws_subnet.public_subnet_1.id,
#     aws_subnet.public_subnet_2.id,
#   ]

# variable "public_1_subnet_id" {
#   type = string
# }

# variable "private_1_subnet_id" {
#   type = string
# }
# variable "private_2_subnet_id" {
#   type=string
# }


