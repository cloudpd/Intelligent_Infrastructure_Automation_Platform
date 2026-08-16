output "repository_url" {
  description = "The full URI of the ECR repository (used for docker push/pull)."
  value       = aws_ecr_repository.this.repository_url
}

output "repository_arn" {
  description = "ARN of the ECR repository (for IAM policy references)."
  value       = aws_ecr_repository.this.arn
}

output "registry_id" {
  description = "The AWS account ID associated with this registry."
  value       = aws_ecr_repository.this.registry_id
}

output "repository_name" {
  description = "The name of the ECR repository."
  value       = aws_ecr_repository.this.name
}
