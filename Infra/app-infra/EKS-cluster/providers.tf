# this is required version of providers if not write them terraform will detect what you write in resources aws_ec2 for example get latest version of aws provider
#  so if you want specific version you can write it here 
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws        = { source = "hashicorp/aws", version = "~> 5.0" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.23" }
    helm       = { source = "hashicorp/helm", version = "~> 2.11" }
    tls        = { source = "hashicorp/tls", version = "~> 4.0" }
    time       = { source = "hashicorp/time", version = "~> 0.9" }
  }
}


#run time configuration for provider 
provider "aws" {
  region  = var.region
  # profile = "hafez-aws" # you can put this profile name in env variables AWS_PROFILE and  put this env varialbe here if you don't want expose your profile name
}

# i will use 2 other providers but later  (kubernetes and helm)
# to make IRSA SA in specific namespace need to configure kubernetes provider 

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.region]
  }

}

provider "helm" {

  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.region]
    }

  }

}