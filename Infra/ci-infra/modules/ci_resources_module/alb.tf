# create the TG 
resource "aws_lb_target_group" "TG-CI-master" {
  name        = "TG-CI-Master"
  target_type = "instance"
  protocol    = "HTTP"
  port        = 80
  vpc_id      = var.vpc_id

  # health check
  health_check {
    enabled             = true
    path                = "/login"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 15
    timeout             = 3
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = {
    Name = "TG-CI-Master"
  }

}
resource "aws_lb_target_group_attachment" "ci_master" {
  target_group_arn = aws_lb_target_group.TG-CI-master.arn
  target_id        = aws_instance.CI_Master.id
  port             = 8080
}

# create ALB
resource "aws_lb" "ci-alb" {
  name               = "ci-alb"
  internal           = false # internet facing
  load_balancer_type = "application"
  security_groups    = [aws_security_group.ALB_SG_allow_443_80_from_anywhere.id]
  #   subnets = [var.public_subnet_1_id, var.public_subnet_2_id, var.public_subnet_3_id]
  subnets = var.list_public_subnets_ids # one per az

  enable_deletion_protection = false # make it true on production

  tags = {
    Name = "ci-alb"
  }
}
# create listener for ALB on TG 
resource "aws_lb_listener" "listen_on_TG_on_http80" {
  load_balancer_arn = aws_lb.ci-alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.TG-CI-master.arn
  }
}

