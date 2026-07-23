# here will make eks cluster & node group & oidc

#1- create Iam Role for EKS controle plane
resource "aws_iam_role" "eks_cluster_role" {
    name = "${var.cluster_name}-cluster-controle-plane-role"
    assume_role_policy = jsonencode(
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRole",
            "Effect": "Allow" ,
            "Principal": {"Service": "eks.amazonaws.com"}
        }
    ]
}
    )
}

# attach policy to the role we created before
resource "aws_iam_role_policy_attachment" "cluster_policies" {
#   policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy" # attach AmazonEKSClusterPolicy to this role , this role will be used by cluster controle plane
#   role = aws_iam_role.eks_cluster_role.name
for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"])
    policy_arn = each.value #attach both policies to this role
    role = aws_iam_role.eks_cluster_role.name # the role we created before
    # so is like i attach 2 policies to this role
}

#--------------------------------------------------------------
# 2- create SG for controle plane & data plane to communicate with each other
#sg for controle plane allow all outbound traffic from control plane to anywhere , so any component on control plane(api-server , ectd,scheduler , controler manger) can communicate with any component on data plane
resource "aws_security_group" "controle_plane_sg" {
    name = "${var.cluster_name}-controle-plane-sg"
    vpc_id = var.vpc_id
    # ingress {
    #     from_port = 443
    #     to_port = 443
    #     protocol = "tcp"
    #     security_groups = [aws_security_group.worker_node_sg.id]
    # }
    egress  {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"] # allow all outbound traffic 0-0 means all ports -1 all protocols
        # allow any resource in the control plane to outbound traffic all ports to anywhere 
    }
  
}

#sg - for worker nodes
# worker nodes need to communicate with control plane (api-server , ectd,scheduler , controler manger)
# worker nodes also need to communicate with each other (pod on wokernode1 need to communicate with pod on wokernode2)



resource "aws_security_group" "worker_node_sg" {
    name = "${var.cluster_name}-worker-node-sg"
    vpc_id = var.vpc_id

    # pods on worker node use this sg use this ingress rule can communicate with pod on another worker node use this sg have this ingress rule
    # self= ture (means any worker node have this sg can communicate with any worker node have this sg)
    # so with that you allow ingress between worker nodes with each other worker node 
    # need to make egress allow all also , do it in egress block

    ingress {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"]
        self = true
        } # allow all inbound traffic between worker nodes -> (pod on node1 to pod on node2 )



    # worker nodes need to communicate with control plane (api-server , ectd,scheduler , controler manger) to recieve instructions
    # so allow ingress from control plane components(api-server , ectd,scheduler , controler manger) to worker nodes components (kubelet, kube-proxy, container.d)
    # slef =true make this ingress rule related to any worker node have this sg , but master node not have this sg and need to make ingress traffic to worker nodes
    # so need to make another ingress rule for master node to communicate with worker nodes on that ports , the above ingress rule allow all ports but between worker nodes only that use this sg

    ingress  {
        from_port = 1025 # allow only ephemeral ports on worker node , component on worker node use this ephemeral ports(kubelet , kube-proxy , container.d)
        to_port = 65535
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    } # open all non-reserved ports between control plane and worker nodes so control plane can communicate with worker nodes on port 1025-65535 in bound to worker nodes
    # so he control plane can communicate with kubelet in worker nodes



    # this egress allow all outbound traffic from worker nodes to anywhere(worker node (first ingress rule ) , control plane (second ingress rule) )
    # worker nodes components (kubelet, kube-proxy, container.d)can communicate with any component on control plane (api-server , ectd,scheduler , controler manger)
    # worker node pod can communicate with another pod in other worker nodes
    egress  {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"] # allow all outbound traffic 0-0 means all ports -1 all protocols
        # allow any resource in the control plane to outbound traffic all ports to anywhere 
    }
  
}

# this like add section of ingress rule to sg-controle-plane allow ingress on port 443 from sg of worker nodes
# allow incoming traffic to cluster (api-server) on port 443 from worker nodes
resource "aws_security_group_rule" "sg_for_api_server" { # is like add rule to sg-controle-plane add ingress rule allow ingress on port 443 from sg of worker nodes
  type  = "ingress"
  from_port = 443
  to_port = 443
  protocol = "tcp"
  security_group_id = aws_security_group.controle_plane_sg.id # allow to this sg port 443 from sg of worker nodes
  source_security_group_id = aws_security_group.worker_node_sg.id #sg of worker nodes
}


#--------------------------------------------------------------
# 2- create EKS cluster


resource "aws_eks_cluster" "eks_cluster" {
    name = var.cluster_name
    version = var.cluster_version

    role_arn = aws_iam_role.eks_cluster_role.arn # the role we created before, needed by the cluster

    vpc_config {
        subnet_ids = var.subnet_ids_list # give him all subnets private & public in vpc , he differ between them by tags we add on them , # give to him from network modules
        security_group_ids = [aws_security_group.controle_plane_sg.id] # controle plane sg -> have 2 rules (ingress on port 443 from worker nodes , egress allow all egress traffic)
        endpoint_private_access = true
        endpoint_public_access = true
    }
    access_config {
        authentication_mode = "API_AND_CONFIG_MAP" # both old way & new way for authentication ( iam user- and her create rbac for you ,rbac only)
        # authentication_mode = "API"
    }

    enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]


    depends_on = [aws_iam_role_policy_attachment.cluster_policies] # attach policy to the role then create the cluster

}