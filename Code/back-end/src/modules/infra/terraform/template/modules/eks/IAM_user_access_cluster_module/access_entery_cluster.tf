
# # give users access to cluster
# make policies for each group of users like (cluster-admin, developers, viewers, etc)
# make authentication mode in cluster to be API_AND_CONFIG_MAP (old way + new way)
# -----------------------------------------

# 684854030943 youssef


resource "aws_eks_access_entry" "cluster_admins" {
  for_each = {for user in var.names_of_users_cluster_admins : "${user.cluster_name}-${user.user_name}" => user}

  cluster_name  = each.value.cluster_name
  principal_arn = "arn:aws:iam::${each.value.user_account_id}:user/${each.value.user_name}"

  type = "STANDARD"
}




resource "aws_eks_access_policy_association" "cluster_admins_policies" {
  for_each = aws_eks_access_entry.cluster_admins
  cluster_name  = each.value.cluster_name
  principal_arn = each.value.principal_arn

  policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }
}
