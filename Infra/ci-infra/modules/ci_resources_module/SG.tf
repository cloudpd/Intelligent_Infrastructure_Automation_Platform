resource "aws_security_group" "ALB_SG_allow_443_80_from_anywhere" {
  name   = "ALB_SG_allow_443_80_from_anywhere"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "ALB_SG_allow_443_80_from_anywhere" }
}

resource "aws_security_group" "Bastion_SG_allow_ssh_from_anywhere" {
  name   = "Bastion_SG_allow_ssh_from_anywhere"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "Bastion_SG_allow_ssh_from_anywhere" }
}

resource "aws_security_group" "CI_Master_SG_allow_ssh_from_Bastion_SG_and_allow_8080_from_ALB_SG" {
  name   = "CI_Master_SG_allow_ssh_from_Bastion_SG_and_allow_8080_from_ALB_SG"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.Bastion_SG_allow_ssh_from_anywhere.id]
  }

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.ALB_SG_allow_443_80_from_anywhere.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "CI_Master_SG_allow_ssh_from_Bastion_SG_and_allow_8080_from_ALB_SG" }
}

resource "aws_security_group" "CI_Agent_SG_allow_ssh_from_Bastion_SG_and_allow_22_50000_from_Master_SG" {
  name   = "CI_Agent_SG_allow_ssh_from_Bastion_SG_and_allow_22_50000_from_Master_SG"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.Bastion_SG_allow_ssh_from_anywhere.id]
  }

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.CI_Master_SG_allow_ssh_from_Bastion_SG_and_allow_8080_from_ALB_SG.id]
  }

  ingress {
    from_port       = 50000
    to_port         = 50000
    protocol        = "tcp"
    security_groups = [aws_security_group.CI_Master_SG_allow_ssh_from_Bastion_SG_and_allow_8080_from_ALB_SG.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "CI_Agent_SG_allow_ssh_from_Bastion_SG_and_allow_22_50000_from_Master_SG" }
}


resource "aws_security_group" "EFS_SG_allow_2049_from_CI_Master_SG" {
  name   = "EFS_SG_allow_2049_from_CI_Master_SG"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.CI_Master_SG_allow_ssh_from_Bastion_SG_and_allow_8080_from_ALB_SG.id]
  }


  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "EFS_SG_allow_2049_from_CI_Master_SG" }
}