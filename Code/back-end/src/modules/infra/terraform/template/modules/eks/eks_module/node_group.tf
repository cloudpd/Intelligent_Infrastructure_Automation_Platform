# create Iam Role for node group 
resource "aws_iam_role" "node_group_role" {
    name = "${var.cluster_name}-node-group-role"
    assume_role_policy = jsonencode(
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRole",
            "Effect": "Allow" ,
            "Principal": {"Service": "ec2.amazonaws.com"}
        }
    ]
}
    )
}

# attach policies to this  node group 
resource "aws_iam_role_policy_attachment" "name" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore" #SSM instead of ssh
  ])

  policy_arn = each.value
  role = aws_iam_role.node_group_role.name
}


#------------------------------------------------------------------------

#create node group dynamic make node group for each node group in map
resource "aws_eks_node_group" "node_group" {
  for_each = var.node_groups # i have one nodegroup 

  cluster_name = aws_eks_cluster.eks_cluster.name
  node_group_name = "${var.cluster_name}-node-group"

  node_role_arn = aws_iam_role.node_group_role.arn # iam role for node group we create above
  
  subnet_ids = var.private_subnet_ids_list # prouce this output from network module and pass it from main.tf

  instance_types = each.value.instance_types
  capacity_type  = each.value.capacity_type

  disk_size = each.value.disk_size

  scaling_config {
    desired_size   = each.value.desired_size
    min_size       = each.value.min_size
    max_size       = each.value.max_size
  }

#   labels = each.value.labels
# dynamic "taint" {
#   for_each = each.value.taints
#   content {
#     key    = taint.value.key
#     value  = taint.value.value
#     effect = taint.value.effect
#   }
  
# }

tags = {
  "Name" = "${var.cluster_name}_node_group"
  "kubernetes.io/cluster-autoscaler/${var.cluster_name}" = "owned"
  "kubernetes.io/cluster-autoscaler/enabled" = "true"
}
lifecycle {
    ignore_changes = [ scaling_config[0].desired_size ]#let auto scaling do its job
  
}



}