
output "argocd_endpoint" {
  value = try(
    data.kubernetes_service.argocd_server.status[0].load_balancer[0].ingress[0].hostname,
    data.kubernetes_service.argocd_server.status[0].load_balancer[0].ingress[0].ip
  )
}