#!/bin/bash
# Mounts the persistent EFS filesystem to /var/lib/jenkins.
# No formatting needed - EFS is already a filesystem the moment it's created.
# Works identically regardless of which AZ this instance launched in,
# since EFS mount targets exist in every subnet/AZ.
#
# Waits for the EFS mount target's DNS name to resolve and the mount itself
# to succeed before proceeding, since mount target creation in AWS can lag
# behind Terraform reporting it as "created."

set -euo pipefail

MOUNT_POINT="/var/lib/jenkins"
EFS_ID="${1:?Usage: $0 <efs-file-system-id>}"
REGION="eu-north-1"
EFS_DNS="${EFS_ID}.efs.${REGION}.amazonaws.com"

MAX_ATTEMPTS=30
SLEEP_SECONDS=10

echo "==> Installing amazon-efs-utils (gives us TLS-encrypted, resilient NFS mounts)"
if ! command -v mount.efs &>/dev/null; then
    yum install -y amazon-efs-utils
fi

echo "==> Creating mount point $MOUNT_POINT"
mkdir -p "$MOUNT_POINT"

echo "==> Waiting for EFS DNS name to resolve: $EFS_DNS"
attempt=1
until getent hosts "$EFS_DNS" >/dev/null 2>&1; do
    if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
        echo "!! Timed out after $((MAX_ATTEMPTS * SLEEP_SECONDS))s waiting for $EFS_DNS to resolve." >&2
        echo "!! Check that an EFS mount target exists in this instance's subnet/AZ, and that the VPC has DNS resolution + DNS hostnames enabled." >&2
        exit 1
    fi
    echo "   Attempt $attempt/$MAX_ATTEMPTS: not resolvable yet, waiting ${SLEEP_SECONDS}s..."
    sleep "$SLEEP_SECONDS"
    attempt=$((attempt + 1))
done
echo "==> DNS resolved."

echo "==> Waiting for EFS mount to succeed"
attempt=1
until mount -t efs -o tls "${EFS_ID}:/" "$MOUNT_POINT" 2>/tmp/mount_efs_err; do
    if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
        echo "!! Timed out after $((MAX_ATTEMPTS * SLEEP_SECONDS))s trying to mount $EFS_ID." >&2
        echo "!! Last error:" >&2
        cat /tmp/mount_efs_err >&2
        exit 1
    fi
    echo "   Attempt $attempt/$MAX_ATTEMPTS: mount failed, retrying in ${SLEEP_SECONDS}s..."
    cat /tmp/mount_efs_err
    sleep "$SLEEP_SECONDS"
    attempt=$((attempt + 1))
done
echo "==> Mount succeeded."

# Persist across reboots. _netdev ensures it waits for networking;
# nofail prevents a failed mount from blocking boot entirely.
if ! grep -q "$EFS_ID" /etc/fstab; then
    echo "${EFS_ID}:/  ${MOUNT_POINT}  efs  _netdev,tls,nofail  0  0" >> /etc/fstab
fi

echo "==> Setting ownership for jenkins user (jenkins package will create this user on install)"
chown -R jenkins:jenkins "$MOUNT_POINT" 2>/dev/null || true

echo "==> Mount complete. Contents of $MOUNT_POINT:"
ls -la "$MOUNT_POINT"