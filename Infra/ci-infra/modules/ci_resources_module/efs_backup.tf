

# resource "aws_ebs_volume" "ci_master_data_vol" {

#   availability_zone = aws_instance.CI_Master.availability_zone # must wait ci master creation to get AZ from it so when manual replace the ebs cause az will be known after creation ec2 ci master so we should put the az of subnet that ec2 ci master is in
#   # availability_zone = var.list_public_subnets_ids[0].availability_zone # same AZ in ec2 of ci master

#   size = 20
#   type = "gp3"

#   tags = {
#     Name = "ci_master_data"
#   }

#   #   lifecycle {
#   #     prevent_destroy = true # not allow destroy when do terraform destroy
#   #   }
# }


resource "aws_efs_file_system" "ci_master_data" {
  creation_token   = "ci_master_data"
  encrypted        = true
  performance_mode = "generalPurpose"   
  throughput_mode  = "elastic"   # if it be slower switch to throughput mode = elastic      , brusting 
  
  tags = {
    Name = "ci_master_data"
  }
}


# comment this when import the efs again 
resource "aws_efs_mount_target" "ci_master_data_mt" {
  # toset -> convert list to set cause for each accept sets & map not list 

  for_each        = var.dict_private_subnets  # make mount target in each private subnet so if master ci created in any subnet will mount to efs
  file_system_id  = aws_efs_file_system.ci_master_data.id # efs id 
  subnet_id       = each.value.id
  security_groups = [aws_security_group.EFS_SG_allow_2049_from_CI_Master_SG.id]
}

# resource "aws_volume_attachment" "attach_vol_to_ci_master" {
#   device_name = "/dev/xvdf"
#   volume_id   = aws_ebs_volume.ci_master_data_vol.id
#   instance_id = aws_instance.CI_Master.id

#   # if instance replaced then force detach the old attachment
#   force_detach = true
# }


# resource "null_resource" "mount_vol_ci_master" {
#   triggers = {
#     instance_id = aws_instance.CI_Master.id # this null resource work when ci master created or instance id changed 
#   }

#   depends_on = [
#     # aws_volume_attachment.attach_vol_to_ci_master,
#       aws_efs_mount_target.ci_master_data_mt,

#     null_resource.update_ssh_config,
#     null_resource.create_inventory_ini
#   ]

# #   # already on local machine configure ~/.ssh/config file
# #   provisioner "local-exec" {
# #     command = <<EOF
# # scp \
# #   -o StrictHostKeyChecking=no \
# #   -o UserKnownHostsFile=/dev/null \
# #   ../modules/ci_resources_module/mount_ebs_backup.sh \
# #   ci-master:/home/ec2-user/mount_ebs_backup.sh

# # ssh \
# #   -o StrictHostKeyChecking=no \
# #   -o UserKnownHostsFile=/dev/null \
# #   ci-master \
# #   "chmod +x /home/ec2-user/mount_ebs_backup.sh && sudo /home/ec2-user/mount_ebs_backup.sh"
# # EOF
# #   }

#  provisioner "local-exec" {
#     command = <<EOF
# scp \
#   -o StrictHostKeyChecking=no \
#   -o UserKnownHostsFile=/dev/null \
#   ../modules/ci_resources_module/mount_efs.sh \
#   ci-master:/home/ec2-user/mount_efs.sh

# ssh \
#   -o StrictHostKeyChecking=no \
#   -o UserKnownHostsFile=/dev/null \
#   ci-master \
#   "chmod +x /home/ec2-user/mount_efs.sh && sudo /home/ec2-user/mount_efs.sh ${aws_efs_file_system.ci_master_data.id}"
# EOF
#   }


# }




resource "null_resource" "run_ansible_install_jenkins" {

  triggers = {
    instance_id = aws_instance.CI_Master.id # this null resource work when ci master created or instance id changed 
  }
  depends_on = [    aws_instance.CI_Master,
    null_resource.update_ssh_config,
    null_resource.create_inventory_ini] # must work after mount_vol_ci_master

  provisioner "local-exec" {
    working_dir = "../Ansible"
    command     = <<EOF
until ansible master -i inventory.ini -m ping -o \
  -e 'ansible_ssh_common_args="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ProxyJump=bastion"' \
  >/dev/null 2>&1
do
  echo "Waiting for CI Master SSH..."
  sleep 10
done

ANSIBLE_HOST_KEY_CHECKING=False \
ansible-playbook -i inventory.ini setup-ci-master.yml
EOF

  }
}



resource "null_resource" "mount_efs_and_restart_jenkins" {
  triggers = {
    instance_id = aws_instance.CI_Master.id
  }

  depends_on = [
    null_resource.run_ansible_install_jenkins,   # Jenkins must already be installed
    aws_efs_mount_target.ci_master_data_mt       # EFS mount target must exist
  ]

  provisioner "local-exec" {
    working_dir = "../Ansible"
    command     = <<EOF
ANSIBLE_HOST_KEY_CHECKING=False \
ansible-playbook -i inventory.ini mount-efs.yml \
  -e "efs_id=${aws_efs_file_system.ci_master_data.id}"
EOF
  }
}