resource "helm_release" "external_dns" {
  name             = "external-dns"
  repository       = "https://kubernetes-sigs.github.io/external-dns"
  chart            = "external-dns"
  namespace        = "external-dns"
  version          = "1.14.3"
  create_namespace = true

  set {
    name  = "provider"
    value = "aws"
  }
  set {
    name  = "aws.region"
    value = var.region
  }

  # This is what tells ExternalDNS which hosted zones to manage.
  # "sync" means it creates AND deletes records.
  # Use "upsert-only" if you want it to only create, never delete.
  # set {
  #   name  = "policy"
  #   value = "sync"
  # }
  set {
  name  = "policy"
  value = "upsert-only"
}

  # Filter to only manage records in YOUR domain — very important in prod
  set {
    name  = "domainFilters[0]"
    value = "mycloudlab.website"       # replace with your actual domain
  }

  # Only manage records that ExternalDNS itself created (safe default)
  set {
    name  = "txtOwnerId"
    value = var.cluster_name
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }
  set {
    name  = "serviceAccount.name"
    value = var.serviceaccount_name_external_dns
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.external_dns_IRSA_arn
  }

  # Only look at Services and Ingresses (not all resource types)
  set {
    name  = "sources[0]"
    value = "service"
  }
  set {
    name  = "sources[1]"
    value = "ingress"
  }

  wait = true
}