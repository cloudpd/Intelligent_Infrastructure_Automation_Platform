output "vpc_id" {
  # value= aws_vpc.terraform_lab1_vpc.id
  value = module.network.NM_vpc_id
}

output "agent_ips" {
  value = module.ci-resources.ci_agent_private_ips
}
output "master_ip" {
  value = module.ci-resources.ci_master_public_ip
}

output "jenkins_url" {
  value = module.ci-resources.jenkins_url
}

output "bastion_ip" {
  value = module.ci-resources.bastion_public_ip
}