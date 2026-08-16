#!/bin/bash
# Runs as root automatically at first boot (cloud-init) - Amazon Linux 2
# Output/errors are logged to /var/log/cloud-init-output.log on the instance.

set -euo pipefail

echo "==> Updating packages"
yum update -y

echo "==> Installing Java 21 (Amazon Corretto) and git"
yum install -y java-21-amazon-corretto git

echo "==> Adding Jenkins repo"
wget -O /etc/yum.repos.d/jenkins.repo \
  https://pkg.jenkins.io/redhat-stable/jenkins.repo
rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key

echo "==> Installing Jenkins"
yum install -y jenkins

echo "==> Enabling and starting Jenkins"
systemctl enable jenkins
systemctl start jenkins

echo "==> user_data script finished. Check /var/lib/jenkins/secrets/initialAdminPassword for the wizard password."