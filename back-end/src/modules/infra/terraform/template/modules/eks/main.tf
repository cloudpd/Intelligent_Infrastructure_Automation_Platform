# ---------------------------------------------------------------------------
# EKS module — orchestrates the sub-modules ported from the standalone EKS
# project. Unlike that project, this module does NOT create a VPC/subnets:
# networking is always supplied by the caller (module.network.* in the
# generated project's root main.tf). See variables.tf for the contract.
#
# NOTE: the standalone project's main.tf also referenced three add-on
# modules that do not exist anywhere in the source project:
#   - Helm_addons_module/kube_prometheus_stack_operator
#   - Helm_addons_module/ELK_Stack
#   - cluster-namespaces_module
# They are intentionally NOT wired up here (migrating a call to a
# nonexistent module source would break `terraform init` immediately).
# Add them back once their Terraform sources actually exist.
# ---------------------------------------------------------------------------

module "eks" {
  source = "./eks_module"

  vpc_id                  = var.vpc_id
  cluster_name             = var.cluster_name
  cluster_version          = var.cluster_version
  subnet_ids_list          = concat(var.public_subnet_ids, var.private_subnet_ids)
  private_subnet_ids_list  = var.private_subnet_ids
  node_groups              = var.node_groups
}

module "IRSA" {
  source = "./IRSA_module"

  cluster_name                          = var.cluster_name
  oidc_provider_url                     = module.eks.oidc_provider_url
  oidc_provider_arn                     = module.eks.oidc_provider_arn
  serviceaccount_name_ebs_csi           = "ebs-csi-controller-sa"
  serviceaccount_name_alb_ingress       = "aws-load-balancer-controller-sa"
  serviceaccount_name_external_dns      = "external-dns-sa"
  serviceaccount_name_external_secrets  = "external-secrets-sa"

  depends_on = [module.eks]
}

module "access-to-cluster" {
  source = "./IAM_user_access_cluster_module"

  names_of_users_cluster_admins = var.names_of_users_cluster_admins

  depends_on = [module.eks]
}

module "helm-ebs-csi" {
  count  = var.enable_ebs_csi ? 1 : 0
  source = "./Helm_addons_module/EBS_csi_driver_module"

  serviceaccount_name_ebs_csi = "ebs-csi-controller-sa"
  ebs_csi_IRSA_arn            = module.IRSA.ebs_csi_IRSA_arn

  depends_on = [module.access-to-cluster]
}

module "helm-alb" {
  count  = var.enable_alb_controller ? 1 : 0
  source = "./Helm_addons_module/ALB_ingrss_controller_module"

  serviceaccount_name_alb_ingress = "aws-load-balancer-controller-sa"
  alb_controller_IRSA_arn         = module.IRSA.alb_controller_IRSA_arn
  cluster_name                    = var.cluster_name
  region                          = var.region
  vpc_id                          = var.vpc_id

  depends_on = [module.access-to-cluster]
}

module "helm-external-dns-operator" {
  count  = var.enable_external_dns ? 1 : 0
  source = "./Helm_addons_module/External_dns_operator_module"

  region                           = var.region
  cluster_name                     = var.cluster_name
  serviceaccount_name_external_dns = "external-dns-sa"
  external_dns_IRSA_arn            = module.IRSA.external_dns_IRSA_arn

  depends_on = [module.access-to-cluster]
}

module "helm-external-secret-operator" {
  count  = var.enable_external_secrets ? 1 : 0
  source = "./Helm_addons_module/External_secret_operator_module"

  external_secrets_service_account_name = "external-secrets-sa"
  external_secrets_IRSA_arn             = module.IRSA.external_secrets_IRSA_arn

  depends_on = [module.access-to-cluster]
}
