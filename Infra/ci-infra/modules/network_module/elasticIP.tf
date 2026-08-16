#createa elastic ip for NatGw
resource "aws_eip" "nat_eip" {
  # depends_on = [ aws_nat_gateway.natGW_private_subnet_terraform_lab1_vpc ] # he say no need for this 
  domain = "vpc" # required
  tags = {
    Name = "eip_for_NatGw"
  }

}