#natGW
resource "aws_nat_gateway" "natGW_private_subnets_cluster_vpc" {
  allocation_id = aws_eip.nat_eip.id
  # subnet_id     = aws_subnet.public_subnet_terraform_lab1_vpc.id
  # subnet_id     = aws_subnet.subnet_terraform_lab1_vpc[2].id # first public ip ([2][3]) those are my public subnets
  subnet_id = aws_subnet.cluster_subnets["public_subnet_1"].id


  tags = {
    Name = "natGW_private_subnet_${var.cluster_name}_vpc"
  }

}

# in dev you make one natgw per vpc but in production you make one natgw per private subnet
# each private subnet will have it's own natgw placed public subnet
# so in production make loop on same count of private subnet and make natGW for each private subnet