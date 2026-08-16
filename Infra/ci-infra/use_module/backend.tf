terraform {
  backend "s3" {
    bucket = "terraform-remote-backend-youssef"
    key    = "terraform.tfstate"
    # key          = "dev/terraform.tfstate"#where you want save state file on bucket 
    # key          = "test/terraform.tfstate"
    # key          = "prod/terraform.tfstate"



    region       = "eu-north-1"
    profile      = "youssef-aws"
    use_lockfile = true #instead of dyanmodb_table cause use s3 to lock state file 
  }
}