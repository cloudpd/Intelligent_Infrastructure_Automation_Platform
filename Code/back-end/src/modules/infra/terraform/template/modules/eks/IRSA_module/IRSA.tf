#IRSA need to create SA in specific namespace need to configure kubernetes provider in provider.tf
locals {
  oidc_sub = replace(var.oidc_provider_url, "https://" , "")
}

#create all your IRSA here (sa associated with role then add policy to it)
resource "aws_iam_role" "ebs_csi_IRSA" {
    name = "${var.cluster_name}-ebs-csi-IRSA-role"

    assume_role_policy = jsonencode(
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Effect": "Allow" ,
            "Principal": {"Federated": "${var.oidc_provider_arn}"},
            "Condition": {
                "StringEquals": {
                    "${local.oidc_sub}:aud": "sts.amazonaws.com",
                    "${local.oidc_sub}:sub": "system:serviceaccount:${var.kube-system_namespace}:${var.serviceaccount_name_ebs_csi}" #:<namespace>:<serviceaccount> # last 2 section
                }
            }

        }
    ]
}
    )
}

#attach policy to IRSA
resource "aws_iam_role_policy_attachment" "ebs_csi_policy" {
    role = aws_iam_role.ebs_csi_IRSA.name
    policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}
# -------------------------------------------------------------------------

#create IRSA for ALB  ingress controller
# alb ingress controller need custome policy there's no policy for it in aws
# we install it in ./custome_policies/alb_iam_policy.json
# refrence to it
resource "aws_iam_policy" "alb_iam_policy" {
    name = "${var.cluster_name}-alb-ingress-iam-policy"
    policy = file("${path.module}/custom_policies/alb_iam_policy.json")
  
}


resource "aws_iam_role" "alb_IRSA" {

    name = "${var.cluster_name}-alb-ingress-IRSA-role"

    assume_role_policy = jsonencode(
        {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Effect": "Allow" ,
            "Principal": {"Federated": "${var.oidc_provider_arn}"},
            "Condition": {
                "StringEquals": {
                    "${local.oidc_sub}:aud": "sts.amazonaws.com",
                    "${local.oidc_sub}:sub": "system:serviceaccount:${var.kube-system_namespace}:${var.serviceaccount_name_alb_ingress}" #:<namespace>:<serviceaccount> # last 2 section
                }
            }

        }
    ]
}
        
    )

}

#attach policy to IRSA
resource "aws_iam_role_policy_attachment" "alb_policy" {
    role = aws_iam_role.alb_IRSA.name
    policy_arn = aws_iam_policy.alb_iam_policy.arn
}



#----------------------------------------------------------------
#create policy to allow ExternalDNS to manage Route53
resource "aws_iam_policy" "external_dns_policy" {
  name        = "${var.cluster_name}-external-dns-policy"
  description = "Allows ExternalDNS to manage Route53 records"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["route53:ChangeResourceRecordSets"]
        Resource = ["arn:aws:route53:::hostedzone/*"]
      },
      {
        Effect   = "Allow"
        Action   = [
          "route53:ListHostedZones",
          "route53:ListResourceRecordSets",
          "route53:ListTagsForResource"
        ]
        Resource = ["*"]
      }
    ]
  })
}

#create IRSA for ExternalDNS 
resource "aws_iam_role" "external_dns_IRSA" {
    name = "${var.cluster_name}-external-dns-IRSA-role"
    
    assume_role_policy = jsonencode(
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Effect": "Allow" ,
            "Principal": {"Federated": "${var.oidc_provider_arn}"},
            "Condition": {
                "StringEquals": {
                    "${local.oidc_sub}:aud": "sts.amazonaws.com",
                    "${local.oidc_sub}:sub": "system:serviceaccount:${var.external-dns_namespace}:${var.serviceaccount_name_external_dns}" #:<namespace>:<serviceaccount> # last 2 section
                }
            }

        }
    ]
}
    )
}

#attach policy to IRSA
resource "aws_iam_role_policy_attachment" "external_dns_policy" {
    role = aws_iam_role.external_dns_IRSA.name
    policy_arn = aws_iam_policy.external_dns_policy.arn
}


#---------------------------------------------------------------------------------------------------------------
#create policy to allow External Secrets Operator to read from Secrets Manager and SSM
resource "aws_iam_policy" "external_secrets_policy" {
  name        = "${var.cluster_name}-external-secrets-policy"
  description = "Allows External Secrets Operator to read from Secrets Manager and SSM"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Secrets Manager — read secrets
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecrets",
          "secretsmanager:ListSecretVersionIds"
        ]
        Resource = "*"
        # Replace * with the ARN of the secret you want to create or give to all secret you have 
        # Optionally restrict to secrets with a specific tag or prefix:
        # Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.cluster_name}/*"
      }
    #   ,
    #   {
    #     # SSM Parameter Store — if you use SSM too
    #     Effect = "Allow"
    #     Action = [
    #       "ssm:GetParameter",
    #       "ssm:GetParameters",
    #       "ssm:GetParametersByPath",
    #       "ssm:DescribeParameters"
    #     ]
    #     Resource = "*"
    #   },
    #   {
    #     # KMS — needed if your secrets are encrypted with a custom KMS key
    #     Effect = "Allow"
    #     Action = [
    #       "kms:Decrypt",
    #       "kms:DescribeKey"
    #     ]
    #     Resource = "*"
    #     # Replace * with your KMS key ARN for tighter security
    #   }
    ]
  })
}

# create IRSA for External Secrets Operator
resource "aws_iam_role" "external_secrets_IRSA" {
    name = "${var.cluster_name}-external-secrets-IRSA-role"
    
    assume_role_policy = jsonencode(
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Effect": "Allow" ,
            "Principal": {"Federated": "${var.oidc_provider_arn}"},
            "Condition": {
                "StringEquals": {
                    "${local.oidc_sub}:aud": "sts.amazonaws.com",
                    "${local.oidc_sub}:sub": "system:serviceaccount:${var.external-secrets_namespace}:${var.serviceaccount_name_external_secrets}" #:<namespace>:<serviceaccount> # last 2 section
                }
            }

        }
    ]
}
    )
}

#attach policy to IRSA
resource "aws_iam_role_policy_attachment" "external_secrets_policy" {
    role = aws_iam_role.external_secrets_IRSA.name
    policy_arn = aws_iam_policy.external_secrets_policy.arn
}