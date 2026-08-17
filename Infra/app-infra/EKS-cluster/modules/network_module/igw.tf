#IGW
resource "aws_internet_gateway" "igw_cluster_vpc" {
  vpc_id = aws_vpc.cluster_vpc.id
  tags = {
    Name = "igw_${var.cluster_name}-vpc"
  }
}