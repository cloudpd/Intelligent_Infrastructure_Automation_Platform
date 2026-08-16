terraform {
  backend "s3" {
    bucket         = "{{stateBucket}}"
    key            = "{{serviceSlug}}/{{environment}}/terraform.tfstate"
    region         = "{{awsRegion}}"
    {{#if lockTable}}
    dynamodb_table = "{{lockTable}}"
    {{/if}}
    encrypt        = true
  }
}
