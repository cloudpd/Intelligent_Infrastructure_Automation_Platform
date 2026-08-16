#!/bin/bash
# Mounts the persistent data volume to /var/lib/jenkins.
# Formats it ONLY the first time (when it has no filesystem yet).
# On every subsequent run (new instance, same volume), it just mounts the
# existing filesystem - your data survives.

set -euo pipefail

MOUNT_POINT="/var/lib/jenkins"

# Resolve the real device path - Nitro instances expose EBS via NVMe,
# not the /dev/xvdf name Terraform requested.
if [ -e /dev/xvdf ]; then
  REAL_DEVICE="/dev/xvdf"
else
  REAL_DEVICE="/dev/nvme1n1"
fi

echo "==> Using device: $REAL_DEVICE"

# Sanity check: make sure the device actually exists before we do anything.
if [ ! -e "$REAL_DEVICE" ]; then
  echo "!! Device $REAL_DEVICE not found. Aborting." >&2
  exit 1
fi

# Use blkid instead of `file -s` - it's built specifically to detect
# filesystem signatures and returns empty/error cleanly on blank devices,
# rather than relying on parsing human-readable text output.
FSTYPE=$(sudo blkid -s TYPE -o value "$REAL_DEVICE" 2>/dev/null || true)

if [ -z "$FSTYPE" ]; then
  echo "==> Volume is blank - formatting with XFS (first-time setup)"
  sudo mkfs -t xfs "$REAL_DEVICE"
  FSTYPE="xfs"
elif [ "$FSTYPE" != "xfs" ]; then
  echo "!! Volume has an unexpected filesystem type: '$FSTYPE'. Refusing to mount blindly." >&2
  echo "!! Investigate manually - this may be the wrong volume or corrupted data." >&2
  exit 1
else
  echo "==> Volume already has a filesystem ($FSTYPE) - skipping mkfs (preserving existing data)"
fi

echo "==> Creating mount point $MOUNT_POINT"
sudo mkdir -p "$MOUNT_POINT"

echo "==> Mounting"
sudo mount -t xfs "$REAL_DEVICE" "$MOUNT_POINT"

UUID=$(sudo blkid -s UUID -o value "$REAL_DEVICE")
if ! grep -q "$UUID" /etc/fstab; then
  echo "UUID=$UUID  $MOUNT_POINT  xfs  defaults,nofail  0  2" | sudo tee -a /etc/fstab
fi

echo "==> Mount complete. Contents of $MOUNT_POINT:"
sudo ls -la "$MOUNT_POINT"