variable "name" {
  type = string
}

variable "cidr" {
  type = string
}

variable "azs" {
  type = list(string)
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = []
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = []
}

variable "internet_gateway" {
  type    = bool
  default = true
}

variable "nat_gateway_strategy" {
  type    = string # "single" | "one_per_az" | "none"
  default = "single"

  validation {
    condition     = contains(["single", "one_per_az", "none"], var.nat_gateway_strategy)
    error_message = "nat_gateway_strategy must be one of: single, one_per_az, none."
  }
}

variable "enable_dns_support" {
  type    = bool
  default = true
}

variable "enable_dns_hostnames" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
