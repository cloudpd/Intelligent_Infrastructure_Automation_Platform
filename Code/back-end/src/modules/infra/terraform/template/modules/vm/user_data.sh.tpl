#!/bin/bash
set -euxo pipefail

# --- Install Docker ---
apt-get update -y
apt-get install -y docker.io
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# --- Install kubectl ---
KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt)
curl -LO "https://dl.k8s.io/release/$${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# --- Install KIND ---
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.23.0/kind-linux-amd64
chmod +x ./kind
mv ./kind /usr/local/bin/kind

# --- KIND cluster config ---
# NODE_PORT is a FIXED constant (30080), not the app's container_port.
# Any Kubernetes Service deployed to this cluster later must be type
# NodePort with nodePort: 30080 to actually be reachable — this is the
# contract between this module and whatever applies manifests afterward.
cat <<EOF > /root/kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 30080
    hostPort: ${host_port}
    protocol: TCP
EOF

kind create cluster --name ${kind_cluster_name} --config /root/kind-config.yaml