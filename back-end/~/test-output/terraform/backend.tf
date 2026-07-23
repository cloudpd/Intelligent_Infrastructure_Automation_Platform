terraform {
  backend "s3" {
    bucket         = ""
    key            = "myapp/prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = ""
    encrypt        = true
  }
}
