
# general subnet 
resource "aws_subnet" "cluster_subnets" {

  vpc_id = aws_vpc.cluster_vpc.id

  for_each = { for subnet in var.subnet_variables_list : subnet.name => subnet } # i choose subnet.name identify each subnet instead of index [0],[1],[2],[3] -> private-subnet1 or public-subnet1 , private-subnet2 or public-subnet2

  #   count = var.subnet_count # you have now 2 public subnets so when you make referencce to one of them must specify which one public-subnet[0] or public-subnet[1]

  # cidr_block = var.subnet_cidr[count.index] # will be [0],[1],[2],[3] each time create subnet with new cidr 1,2 private 3,4 public
  cidr_block = each.value.subnet_cidr

  # availability_zone = "${var.region}${var.AZ_letters[count.index]}" # region +(a,b,c) eu-north-1a,eu-north-1b,eu-north-1c
  availability_zone = "${var.region}${each.value.AZ_letters}" # region +(a,b,c,a) eu-north-1a,eu-north-1b,eu-north-1c

  # map_public_ip_on_launch = var.public_ip_available[count.index] # first 2 private will be false and other 2 will be true public # also make it list but need to remeber 1,2 private 3,4 public
  map_public_ip_on_launch = each.value.type == "public" ? true : false # if type of subnet is public will be true, if not will be false

  tags = merge(
    {
      # Name = "${var.tag_subnet_name[count.index]}_subnet${count.index}_terraform_lab1_vpc" # first 2 private 2 and other 2 public
      Name                                        = "${each.value.name}_EKS_cluster"
      "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    },
    each.value.type == "public" ? { "kubernetes.io/role/elb" = "1" } : { "kubernetes.io/role/internal-elb" = "1" }
    # kubernetes use kubernetes.io/role/elb=1 if the subnet is public and kubernetes.io/role/internal-elb=1 if the subnet is private 
    # to know this public subnet can put ALB inside of it but private subnet can't , and internal elb can't put in public subnet ,but can put in private subnet
  )
}