# 7- create public route table
# 8- create private route table
# 9- create route in public route table 0.0.0.0/0 -> igw
# 10- create route in private route table 0.0.0.0/0 -> natgw
# 11- associate public subnet with public route table
# 12_ associate private subnet with private route table
resource "aws_route_table" "public_route_table_cluster_vpc" {

  vpc_id = aws_vpc.cluster_vpc.id
  # route {
  #     cidr_block = "0.0.0.0/0"
  #     gateway_id = aws_internet_gateway.igw_terraform_lab1_vpc.id
  # }
  tags = {
    Name = "public_route_table_${var.cluster_name}_vpc"
  }
}

resource "aws_route_table" "private_route_table_cluster_vpc" {
  vpc_id = aws_vpc.cluster_vpc.id
  # route {
  #     cidr_block = "0.0.0.0/0"
  #     gateway_id = aws_nat_gateway.natGW_private_subnet_terraform_lab1_vpc.id
  # }
  tags = {
    Name = "private_route_table_${var.cluster_name}_vpc"
  }

}

# add routes 
resource "aws_route" "public_route_cluster_vpc" {
  route_table_id         = aws_route_table.public_route_table_cluster_vpc.id # associate this route with public RT 
  destination_cidr_block = "0.0.0.0/0"                                       # src
  gateway_id             = aws_internet_gateway.igw_cluster_vpc.id           # dst
}

resource "aws_route" "private_route_cluster_vpc" {
  route_table_id         = aws_route_table.private_route_table_cluster_vpc.id   # associate this route with private RT
  destination_cidr_block = "0.0.0.0/0"                                          # src
  nat_gateway_id         = aws_nat_gateway.natGW_private_subnets_cluster_vpc.id # dst
  depends_on             = [aws_nat_gateway.natGW_private_subnets_cluster_vpc]  # make sure natGW is created before adding route
}

# associate subnets 

resource "aws_route_table_association" "private_subnet_association_cluster_vpc" {
  # subnet_id      = aws_subnet.private_subnet_terraform_lab1_vpc.id # private subnet
  count = 3 # -> 0,1,2
  # subnet_id      = aws_subnet.subnet_terraform_lab1_vpc[count.index].id
  subnet_id      = aws_subnet.cluster_subnets["private_subnet_${count.index + 1}"].id # [0,1] +1 -> private-subnet-1, private-subnet-2
  route_table_id = aws_route_table.private_route_table_cluster_vpc.id                 # private RT
}

resource "aws_route_table_association" "public_subnet_association_cluster_vpc" {
  # subnet_id      = aws_subnet.public_subnet_terraform_lab1_vpc.id           # public subnet
  count = 3 #-> 2,3 -> must add +2
  # subnet_id      = aws_subnet.subnet_terraform_lab1_vpc[count.index+2].id # -> (0,1) +2-> 2,3
  subnet_id      = aws_subnet.cluster_subnets["public_subnet_${count.index + 1}"].id # [0,1] +1 -> public-subnet-1, public-subnet-2
  route_table_id = aws_route_table.public_route_table_cluster_vpc.id                 # public RT
}





# # instaead of make associate for each subnet i can make general association for all subnets public -> public RT & private -> private RT

# resource "aws_route_table_association" "subnet_association_terraform_lab1_vpc" {
#   count =4 # 4 subnets 

#   subnet_id      = aws_subnet.subnet_terraform_lab1_vpc[count.index].id # first 2subnet are private and other 2 are public
#   route_table_id = aws_route_table.public_route_table_terraform_lab1_vpc.id #  first 2subnet with private RT and other 2 subnet with public RT

# }