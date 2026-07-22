provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "{{projectSlug}}"
      Environment = "{{environment}}"
      ManagedBy   = "autodeployers"
    }
  }
}
