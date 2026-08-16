resource "aws_vpc" "ci_vpc" {
  # take region from provider.tf default region for your resources 
  # cidr_block = "10.100.0.0/16"
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true # to allow dns name in this vpc , to connect to db with endpoint (dns name)
  enable_dns_support   = true


  tags = {
    Name = "ci_vpc" # i can make this variable also but no problem if some one do same name no problem , it will be in diff workspace and it will be diff account if (enterprice) or diff region or add tags to know this is env(dev,test,prod)
  }
}