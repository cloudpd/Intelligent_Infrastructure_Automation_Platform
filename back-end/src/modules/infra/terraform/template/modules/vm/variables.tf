variable "vpc_id" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "instance_type" {
  type = string
}

variable "kind_cluster_name" {
  type = string
}

variable "container_port" {
  type = number
}

variable "host_port" {
  type = number
}