
resource "aws_instance" "ec2_bastion_host_ci_vpc" {


  # ami                         = "ami-09e320d375d7b8d3e"                                                  # ami for amazon linux 23
  ami = data.aws_ami.amazon_linux_23.id # get ami_id from data source
  # instance_type             = "t3.micro"      
  instance_type = var.bastion_instance_type      # t3.micro t2.micro not exist in stockholm
  subnet_id     = var.list_public_subnets_ids[0] # will create at any public subnet 
  # public subnet 

  vpc_security_group_ids      = [aws_security_group.Bastion_SG_allow_ssh_from_anywhere.id] # use bastion SG
  associate_public_ip_address = true                                                       # create public ip
  key_name                    = "ssh-private-key"                                          # use key pair this 
  tags = {
    Name = "Bastion_host"
  }




}

# ci-master & ci agent  inside private subnet
resource "aws_instance" "CI_Master" {

  # count = 2 

  # ami                    = "ami-07aacd2013ac45b9e" # ami for my ami have nginx on amazon linux 23
  # ami                    = data.aws_ami.nginx_my_ami.id # get ami_id from data source
  ami = data.aws_ami.amazon_linux_23.id
  # availability_zone = "eu-north-1a" # must have subnet in this AZ first#AZ of this ci master must be fixed so if destroy create in same AZ to claim same EBS backup 

  # instance_type          = "t3.micro"
  instance_type = var.ci_master_instance_type     # this each time should be in same AZ 1a 
  subnet_id     = var.list_private_subnets_ids[0] # get the first one each time  # this each time should be in same AZ 1a  and should later take backeup of the ebs in 

  vpc_security_group_ids      = [aws_security_group.CI_Master_SG_allow_ssh_from_Bastion_SG_and_allow_8080_from_ALB_SG.id]
  key_name                    = "ssh-private-key"
  associate_public_ip_address = false

  # user_data= file("${path.module}/jenkins_master_userdata_setup.sh")                                                                   # create public ip
  # user_data_replace_on_change = true 

  tags = {
    Name = "CI_Master"
  }

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true # keep the root device to not lose data of jenkins 
    tags = {
      Name = "jenkins root volume "
    }
  }
}




resource "aws_instance" "CI_Agent" {
  count = var.ci_agent_count #create $count number of agents and it will be list called CI_Agent

  ami           = data.aws_ami.amazon_linux_23.id
  instance_type = var.ci_agent_instance_type

  # subnet_id = [var.list_private_subnets_ids[count.index]  ] # this works if the ec2 = subnet count 
  subnet_id = element(var.list_private_subnets_ids, count.index)

  # if i have 2 subnets and 4 ec2 
  # subnet1[] -> ec2-1 , subnet2 -> ec2-2 , subnet1 -> ec2-3 , subnet2 -> ec2-4 and so one or use this 

  #  subnet_id = var.list_private_subnets_ids[
  #   count.index % length(var.list_private_subnets_ids)
  # ]


  vpc_security_group_ids = [
    aws_security_group.CI_Agent_SG_allow_ssh_from_Bastion_SG_and_allow_22_50000_from_Master_SG.id
  ]

  key_name                    = "ssh-private-key"
  associate_public_ip_address = false
  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true # keep the root device to not lose data of jenkins 

  }


  tags = {
    Name = "CI_Agent_${count.index + 1}"
  }
}





# this configure ~/.ssh/config file in my local machine

resource "null_resource" "update_ssh_config" {
  triggers = {
    bastion = aws_instance.ec2_bastion_host_ci_vpc.public_ip
    master  = aws_instance.CI_Master.private_ip
    agents  = join(",", aws_instance.CI_Agent[*].private_ip)
  }

  provisioner "local-exec" {
    command = <<EOF
cat > ~/.ssh/config <<CONFIG
Host bastion
  HostName ${aws_instance.ec2_bastion_host_ci_vpc.public_ip}
  User ec2-user
  StrictHostKeyChecking no
  IdentityFile ~/ssh-private-key.pem

Host ci-master
  HostName ${aws_instance.CI_Master.private_ip}
  User ec2-user
  IdentityFile ~/ssh-private-key.pem
  StrictHostKeyChecking no
  ProxyJump bastion

${join("\n\n", [
    for idx, ip in aws_instance.CI_Agent[*].private_ip :
    <<EOT
Host ci-agent-${idx + 1}
  HostName ${ip}
  User ec2-user
  IdentityFile ~/ssh-private-key.pem
  StrictHostKeyChecking no
  ProxyJump bastion
EOT
])}
CONFIG
EOF
}
}



resource "null_resource" "create_inventory_ini" {

  depends_on = [aws_instance.CI_Master, aws_instance.CI_Agent]

  triggers = {
    master = aws_instance.CI_Master.private_ip
    agents = join(",", aws_instance.CI_Agent[*].private_ip)
  }

  provisioner "local-exec" {

    command = <<EOF
cat > ../Ansible/inventory.ini <<CONFIG
[master]
ci-master ansible_host=${aws_instance.CI_Master.private_ip}

[agents]
${join("\n", [
    for idx, ip in aws_instance.CI_Agent[*].private_ip :
    "ci-agent-${idx + 1} ansible_host=${ip}"
])}

[all:vars]
ansible_user=ec2-user
ansible_ssh_private_key_file=~/ssh-private-key.pem
ansible_ssh_common_args='-o ProxyJump=bastion'
CONFIG
EOF

}
}


resource "null_resource" "run_ansible" {
  triggers = {
    agents  = join(",", aws_instance.CI_Agent[*].private_ip)
  }

  depends_on = [
    aws_instance.CI_Agent,
    aws_instance.CI_Master,
    aws_instance.ec2_bastion_host_ci_vpc,
    null_resource.create_inventory_ini,
    null_resource.update_ssh_config
  ]

  provisioner "local-exec" {
    command = <<EOF
#!/bin/bash
set -e

echo "Waiting for SSH on all hosts..."

until ansible all \
  -i ../Ansible/inventory.ini \
  -m ping \
  -o \
  -e 'ansible_ssh_common_args="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ProxyJump=bastion"' \
  >/dev/null 2>&1
do
    echo "Still waiting..."
    sleep 10
done

echo "SSH is ready."

ANSIBLE_HOST_KEY_CHECKING=False \
ansible-playbook \
-i ../Ansible/inventory.ini \
../Ansible/setup-ci-agents.yml
EOF
  }
}
