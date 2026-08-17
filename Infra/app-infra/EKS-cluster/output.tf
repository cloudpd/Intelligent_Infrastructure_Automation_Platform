# Exposed so the Jenkins pipeline can read cluster_name/cluster_endpoint with
# `terraform output` for `aws eks update-kubeconfig` + `argocd cluster add`.
# cluster_certificate_authority_data is kept available too, in case it's needed
# elsewhere, though the CLI-based registration flow doesn't need it directly.

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  value = module.eks.cluster_certificate_authority_data

}

output "argocd_endpoint"{

  value = module.helm-argocd.argocd_endpoint
}



