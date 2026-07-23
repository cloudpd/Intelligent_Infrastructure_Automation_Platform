# ---------------------------------------------------------------------------
# Networking inputs — ALWAYS supplied by the caller from `module.network.*`
# outputs (see ../../main.tf / snippets/eks.hbs). This module never creates
# its own VPC/subnets and never accepts raw CIDRs — that would recreate the
# duplicate-networking problem this migration removes.
# ---------------------------------------------------------------------------
variable "vpc_id" {
  type        = string
  description = "VPC id from the Network module (module.network.vpc_id)."
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnet ids from the Network module (module.network.public_subnet_ids)."
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet ids from the Network module (module.network.private_subnet_ids)."
}

# ---------------------------------------------------------------------------
# Cluster inputs — supplied by the generator from the EKS DB config
# ---------------------------------------------------------------------------
variable "region" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "cluster_version" {
  type = string
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

variable "grafana_admin_password" {
  type      = string
  sensitive = true
  default   = null
}

# ---------------------------------------------------------------------------
# Add-on toggles — let the generator turn Helm add-ons on/off per project
# without editing this module. All default to true to match the original
# standalone EKS project's behavior.
# ---------------------------------------------------------------------------
variable "enable_ebs_csi" {
  type    = bool
  default = true
}

variable "enable_alb_controller" {
  type    = bool
  default = true
}

variable "enable_external_dns" {
  type    = bool
  default = true
}

variable "enable_external_secrets" {
  type    = bool
  default = true
}
