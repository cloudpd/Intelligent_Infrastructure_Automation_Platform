resource "aws_vpc" "cluster_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true # to allow dns name in this vpc , to connect to db with endpoint (dns name), mandatory for eks cluster's vpc


  tags = {
    Name = "${var.cluster_name}-vpc" # i can make this variable also but no problem if some one do same name no problem , it will be in diff workspace and it will be diff account if (enterprice) or diff region or add tags to know this is env(dev,test,prod)
  }
}