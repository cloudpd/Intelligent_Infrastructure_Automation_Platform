variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "cidr" {
  type = string
}

variable "az_count" {
  description = "Number of Availability Zones to spread subnets across. EKS requires at least 2."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 1 && var.az_count <= 6
    error_message = "az_count must be between 1 and 6 (AWS regions have at most 6 AZs, and subnet CIDR math here assumes a /16-or-larger cidr)."
  }
}