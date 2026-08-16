# this is custom image have most of tools i will used it 
FROM amazonlinux:2023

RUN yum update -y && \
    yum install -y tar gzip unzip  git jq openssl && \
    yum clean all

# ---------- AWS CLI v2 ----------
RUN curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws

# ---------- kubectl (pin to a version matching your EKS/kops cluster's k8s version) ----------
ARG KUBECTL_VERSION=v1.35.2
RUN curl -fsSLo /usr/local/bin/kubectl \
    "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl" && \
    chmod +x /usr/local/bin/kubectl

# ---------- kops (pin explicitly, don't float on "latest") ----------
ARG KOPS_VERSION=1.35.1
RUN curl -fsSLo /usr/local/bin/kops \
    "https://github.com/kubernetes/kops/releases/download/v${KOPS_VERSION}/kops-linux-amd64" && \
    chmod +x /usr/local/bin/kops

# ---------- Helm ----------
# RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
ARG HELM_VERSION=v3.20.2

RUN curl -fsSLo helm.tar.gz \
    https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz && \
    tar -xzf helm.tar.gz && \
    mv linux-amd64/helm /usr/local/bin/helm && \
    chmod +x /usr/local/bin/helm && \
    rm -rf helm.tar.gz linux-amd64


# ---------- ArgoCD CLI (always the latest stable release) ----------
RUN curl -fsSLo /usr/local/bin/argocd \
    "https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64" && \
    chmod +x /usr/local/bin/argocd

# ---------- Terraform ----------
ARG TERRAFORM_VERSION=1.15.8

RUN curl -fsSLo terraform.zip \
    "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" && \
    unzip terraform.zip && \
    mv terraform /usr/local/bin/terraform && \
    chmod +x /usr/local/bin/terraform && \
    rm -f terraform.zip
    
# ---------- Sanity check every tool at build time, fail fast if something's broken ----------
# ---------- Sanity check ----------
RUN aws --version && \
    terraform version && \
    kubectl version --client && \
    kops version && \
    helm version && \
    argocd version --client

WORKDIR /workspace