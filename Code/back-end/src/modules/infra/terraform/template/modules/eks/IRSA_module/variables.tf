variable "cluster_name" {
  type = string
}

variable "oidc_provider_url" {
  type = string
}

variable "oidc_provider_arn" {
  type = string
}

variable "kube-system_namespace" {
  type = string
  default = "kube-system"
}

variable "serviceaccount_name_ebs_csi" {
  type = string
}

variable "serviceaccount_name_alb_ingress" {
  type = string
}


variable "serviceaccount_name_external_dns" {
  type = string
}
variable "external-dns_namespace" {
  type = string
  default = "external-dns"
}

variable "serviceaccount_name_external_secrets" {
  type = string
}
variable "external-secrets_namespace" {
  type = string
  default = "external-secrets"
}