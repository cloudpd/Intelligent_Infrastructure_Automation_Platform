output "NM_subnets" {                # ths get subnet object consist of 4 subnets i can traverse inside of them use (public-subnet1, public-subnet2, private-subnet1, private-subnet2)
  value = aws_subnet.cluster_subnets # give me all subnet i can use them 
}

output "NM_vpc_id" {
  value = aws_vpc.cluster_vpc.id
}

output "NM_vpc_cidr" {
  value = aws_vpc.cluster_vpc.cidr_block
}

output "NM_subnet_ids" { #iterate over the subnets make list of subnet ids
  value = [
    for subnet in aws_subnet.cluster_subnets : subnet.id
  ]
}

# output "public_subnet_ids" {
#   value = [
#     for subnet in aws_subnet.cluster_subnets :
#     subnet.id
#     if subnet.map_public_ip_on_launch == true
#   ]
# }

output "NM_private_subnet_ids" {
  value = [
    for subnet in aws_subnet.cluster_subnets :
    subnet.id
    if subnet.map_public_ip_on_launch == false
  ]
}