terraform {
  backend "s3" {
    bucket         = "{{stateBucket}}"
    key            = "{{serviceSlug}}/{{environment}}/terraform.tfstate"
    region         = "{{awsRegion}}"
    dynamodb_table = "{{lockTable}}"
    encrypt        = true
  }
}
