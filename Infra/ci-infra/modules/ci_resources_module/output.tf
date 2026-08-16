output "bastion_public_ip" {
  value = aws_instance.ec2_bastion_host_ci_vpc.public_ip
}

output "ci_master_public_ip" {
  value = aws_instance.CI_Master.private_ip
}


output "ci_agent_private_ips" {
  value = aws_instance.CI_Agent[*].private_ip
}


output "jenkins_url" {
  value = "http://${aws_lb.ci-alb.dns_name}"
}