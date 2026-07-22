terraform {
  backend "s3" {
    bucket         = "{{stateBucket}}"
    key            = "{{projectSlug}}/{{environment}}/terraform.tfstate"
    region         = "{{awsRegion}}"
    dynamodb_table = "{{lockTable}}"
    encrypt        = true
  }
}
