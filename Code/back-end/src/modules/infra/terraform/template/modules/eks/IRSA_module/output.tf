output "ebs_csi_IRSA_arn" {
    value = aws_iam_role.ebs_csi_IRSA.arn
}

output "alb_controller_IRSA_arn" {
    value = aws_iam_role.alb_IRSA.arn
}

output "external_dns_IRSA_arn" {
  value= aws_iam_role.external_dns_IRSA.arn
}

output "external_secrets_IRSA_arn" {
  value = aws_iam_role.external_secrets_IRSA.arn
}