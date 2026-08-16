#IGW
resource "aws_internet_gateway" "igw_ci_vpc" {
  vpc_id = aws_vpc.ci_vpc.id
  tags = {
    Name = "igw_ci_vpc"
  }
}