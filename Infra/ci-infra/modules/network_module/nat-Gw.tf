#natGW
resource "aws_nat_gateway" "natGW_private_subnet_ci_vpc" {
  allocation_id = aws_eip.nat_eip.id
  # subnet_id     = aws_subnet.public_subnet_terraform_lab1_vpc.id
  # subnet_id     = aws_subnet.subnet_terraform_lab1_vpc[2].id # first public ip ([2][3]) those are my public subnets
  subnet_id = aws_subnet.subnet_ci_vpc["public_subnet_1"].id


  tags = {
    Name = "natGW_private_subnet_ci_vpc"
  }

}