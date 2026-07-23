resource "helm_release" "ebs_csi_driver" {
  name       = "aws-ebs-csi-driver"
  repository = "https://kubernetes-sigs.github.io/aws-ebs-csi-driver"
  chart      = "aws-ebs-csi-driver"
  namespace  = "kube-system"
  version = "2.25.0"
  set {
    name = "controller.serviceAccount.create"
    value = "true" # he will create SA so must match name we put in IRSA
  }
  set{
    name = "controller.serviceAccount.name"
    value = var.serviceaccount_name_ebs_csi # he create
  }
  set{
    name = "controller.serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.ebs_csi_IRSA_arn # IRSA arn from IRSA module
  }
}


