#after create the eks cluster , cluster have issure url & certificate need to get them to make oidc provider

data "tls_certificate" "eks-oidc-issuer" {
    url = aws_eks_cluster.eks_cluster.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "oidc" {
  client_id_list = [ "sts.amazonaws.com" ]
  thumbprint_list = [ data.tls_certificate.eks-oidc-issuer.certificates[0].sha1_fingerprint ]
  url = aws_eks_cluster.eks_cluster.identity[0].oidc[0].issuer
}