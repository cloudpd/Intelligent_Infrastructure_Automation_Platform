module "cluster-vpc" {
  source                = "./modules/network_module/"
  cluster_name          = var.cluster_name
  vpc_cidr              = var.vpc_cidr
  subnet_variables_list = var.subnet_variables_list
  region                = var.region
}



module "eks" {
  source          = "./modules/eks_module"
  vpc_id          = module.cluster-vpc.NM_vpc_id
  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  #you can make it like this or make output from network module
  # subnet_ids = [ module.cluster-vpc.NM_subnets["private_subnet_1"].id, 
  #                 module.cluster-vpc.NM_subnets["private_subnet_2"].id,
  #                 module.cluster-vpc.NM_subnets["private_subnet_3"].id
  #               ]
  subnet_ids_list         = module.cluster-vpc.NM_subnet_ids
  node_groups             = var.node_groups
  private_subnet_ids_list = module.cluster-vpc.NM_private_subnet_ids

  depends_on = [module.cluster-vpc]
}

module "IRSA" {
  source                               = "./modules/IRSA_module"
  cluster_name                         = var.cluster_name
  oidc_provider_url                    = module.eks.oidc_provider_url
  oidc_provider_arn                    = module.eks.oidc_provider_arn
  serviceaccount_name_ebs_csi          = "ebs-csi-controller-sa"
  serviceaccount_name_alb_ingress      = "aws-load-balancer-controller-sa"
  serviceaccount_name_external_dns     = "external-dns-sa"
  serviceaccount_name_external_secrets = "external-secrets-sa"
  depends_on                           = [module.eks]
}


module "access-to-cluster" {
  source                        = "./modules/IAM_user_access_cluster_module"
  names_of_users_cluster_admins = var.names_of_users_cluster_admins
  depends_on                    = [module.eks]
}

module "Helm-ebs-csi" {
  source = "./modules/Helm_addons_module/EBS_csi_driver_module"
  # you can make it like that or take it directly
  # serviceaccount_name_ebs_csi = module.IRSA.serviceaccount_name_ebs_csi
  serviceaccount_name_ebs_csi = "ebs-csi-controller-sa"
  ebs_csi_IRSA_arn            = module.IRSA.ebs_csi_IRSA_arn

  depends_on = [module.access-to-cluster]

}

module "helm-alb" {
  source = "./modules/Helm_addons_module/ALB_ingrss_controller_module"
  # you can make it like that or take it directly
  # serviceaccount_name_alb_ingress = module.IRSA.serviceaccount_name_alb_ingress
  serviceaccount_name_alb_ingress = "aws-load-balancer-controller-sa"
  alb_controller_IRSA_arn         = module.IRSA.alb_controller_IRSA_arn
  cluster_name                    = var.cluster_name
  region                          = var.region
  vpc_id                          = module.cluster-vpc.NM_vpc_id
  depends_on                      = [module.access-to-cluster, module.Helm-ebs-csi]
}

module "helm-external-dns-operator" {
  source                           = "./modules/Helm_addons_module/External_dns_operator_module"
  region                           = var.region
  cluster_name                     = var.cluster_name
  serviceaccount_name_external_dns = "external-dns-sa"
  external_dns_IRSA_arn            = module.IRSA.external_dns_IRSA_arn
  depends_on                       = [module.access-to-cluster, module.helm-alb, module.Helm-ebs-csi]

}

module "helm-external-secret-operator" {
  source                                = "./modules/Helm_addons_module/External_secret_operator_module"
  external_secrets_service_account_name = "external-secrets-sa"
  external_secrets_IRSA_arn             = module.IRSA.external_secrets_IRSA_arn
  depends_on                            = [module.access-to-cluster, module.Helm-ebs-csi, module.helm-alb, module.helm-external-dns-operator]
}


module "helm-argocd" {
  source = "./modules/Helm_addons_module/Argo_CD_operator_module"
  
  depends_on = [
    module.access-to-cluster,
    module.Helm-ebs-csi,
    module.helm-alb,
    module.helm-external-dns-operator,
    module.helm-external-secret-operator
  ]
}
