
#--------------------------------------------------------------------------------------------------
#install alb ingress controller

resource "helm_release" "alb_ingress_controller" {
 
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version = "1.6.2"

  set{
    name = "clusterName"
    value = var.cluster_name
  }
  set{
    name = "region"
    value = var.region
  }
  set{
    name = "vpcId"
    value = var.vpc_id
  }
  set{
    name = "replicaCount"
    value = "2"
  }
  set {
    name = "serviceAccount.create"
    value = "true" # he will create SA so must match name we put in IRSA
  }
  set{
    name = "serviceAccount.name"
    value = var.serviceaccount_name_alb_ingress # he create
  }
  set{
    name = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.alb_controller_IRSA_arn # IRSA arn from IRSA module
  }
}
