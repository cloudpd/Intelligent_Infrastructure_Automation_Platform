provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Service     = "myapp"
      Environment = "prod"
      ManagedBy   = "autodeployers"
    }
  }
}
