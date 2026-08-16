output "NM_subnets" {              # this gives you the whole dictionary key and value
  value = aws_subnet.subnet_ci_vpc # give me all subnet i can use them 
}


output "NM_public_subnets" {
  value = {
    for name, subnet in aws_subnet.subnet_ci_vpc :
    name => subnet
    if subnet.map_public_ip_on_launch
  }
}

output "NM_private_subnets" {
  value = {
    for name, subnet in aws_subnet.subnet_ci_vpc :
    name => subnet
    if subnet.map_public_ip_on_launch == false
  }
}


output "NM_vpc_id" {
  value = aws_vpc.ci_vpc.id
}

output "NM_vpc_cidr" {
  value = aws_vpc.ci_vpc.cidr_block
}

