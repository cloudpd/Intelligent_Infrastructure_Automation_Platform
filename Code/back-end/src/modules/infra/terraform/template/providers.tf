provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Service     = "{{serviceSlug}}"
      Environment = "{{environment}}"
      ManagedBy   = "autodeployers"
    }
  }
}
{{#if eksEnabled}}
# Kubernetes/Helm providers authenticate against the cluster this project's
# own `module.eks` creates — these are literal references to that module's
# outputs, never values supplied by the generator/DB.
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.aws_region]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.aws_region]
    }
  }
}
{{/if}}
