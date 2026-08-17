#createa elastic ip for NatGw
resource "aws_eip" "nat_eip" {
  # depends_on = [ aws_nat_gateway.natGW_private_subnet_terraform_lab1_vpc ] # he say no need for this 
  domain     = "vpc"                                  # required
  depends_on = [aws_internet_gateway.igw_cluster_vpc] # after creae IGW
  tags = {
    Name = "eip_for_NatGw"
  }

}
# in dev you make one natgw per vpc but in production you make one natgw per private subnet
# each private subnet will have it's own natgw placed public subnet
# so if production make loop on same count of private subnet and make eip for each natgw