
resource "helm_release" "external_secrets" {

  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"

  chart            = "external-secrets"
  namespace        = "external-secrets"

  # version          = "0.9.13" # v1beta
  # version = "0.14.4" # let him pull the latest version
  create_namespace = true


  set {
    name  = "serviceAccount.create"
    value = "true"
  }
  set {
    name  = "serviceAccount.name"
    value = var.external_secrets_service_account_name
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.external_secrets_IRSA_arn
  }

  # Install the CRDs automatically
  set {
    name  = "installCRDs"
    value = "true"
  }

  wait = true
}