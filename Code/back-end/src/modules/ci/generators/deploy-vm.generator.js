/**
 * Generates the CD step(s) that deploy to a VM-hosted KIND cluster.
 *
 * Unlike EKS, the VM's KIND cluster has no network path reachable from the
 * GitHub Actions runner: the security group only opens the app's host_port
 * (see terraform/template/modules/vm/main.tf — "No SSH"), and the instance
 * only carries an SSM instance profile, not a public API endpoint. So the
 * runner cannot `kubectl apply` directly against it the way it can against
 * EKS.
 *
 * Instead this step ships the manifests already checked out under k8s/
 * (the same directory the EKS path applies via `kubectl apply -f k8s/`,
 * written by the k8s module) to the instance over AWS SSM, and runs
 * `kubectl apply` locally on the box against the kubeconfig `kind create
 * cluster` wrote out during provisioning (user_data.sh.tpl runs as root, so
 * the kubeconfig lives at /root/.kube/config).
 */
class DeployVmGenerator {
  constructor(instanceId, kindClusterName) {
    this.instanceId = instanceId;
    this.kindClusterName = kindClusterName || 'kind';
  }

  generate() {
    const instanceRef = this.instanceId
      ? this.instanceId
      : '${{ secrets.VM_INSTANCE_ID }}';

    // Commands executed on the VM itself via SSM's AWS-RunShellScript
    // document. Kept as a JSON array literal so it can be embedded
    // directly into the `aws ssm send-command --parameters` call.
    const remoteCommands = [
      'set -e',
      'mkdir -p /tmp/k8s-deploy',
      'echo "$MANIFEST_B64" | base64 -d | tar -xzf - -C /tmp/k8s-deploy',
      'export KUBECONFIG=/root/.kube/config',
      `kubectl config use-context kind-${this.kindClusterName}`,
      'kubectl apply -f /tmp/k8s-deploy/k8s',
    ];
    const remoteCommandsJson = JSON.stringify(remoteCommands);

    return [
      {
        name: 'Package Kubernetes Manifests',
        run: 'echo "MANIFEST_B64=$(tar -czf - k8s | base64 -w0)" >> "$GITHUB_ENV"',
      },
      {
        name: 'Deploy to VM via AWS SSM',
        run: [
          `INSTANCE_ID="${instanceRef}"`,
          '',
          'COMMAND_ID=$(aws ssm send-command \\',
          '  --instance-ids "$INSTANCE_ID" \\',
          '  --document-name "AWS-RunShellScript" \\',
          '  --comment "Deploy ${{ github.repository }}@${{ github.sha }}" \\',
          `  --parameters commands='${remoteCommandsJson}' \\`,
          '  --query "Command.CommandId" --output text)',
          '',
          'echo "SSM command id: $COMMAND_ID"',
          '',
          '# Give the command a moment to be registered before polling it.',
          'sleep 5',
          '',
          'STATUS="InProgress"',
          'for i in $(seq 1 30); do',
          '  STATUS=$(aws ssm get-command-invocation \\',
          '    --command-id "$COMMAND_ID" \\',
          '    --instance-id "$INSTANCE_ID" \\',
          '    --query "Status" --output text 2>/dev/null || echo "Pending")',
          '  if [ "$STATUS" != "Pending" ] && [ "$STATUS" != "InProgress" ]; then',
          '    break',
          '  fi',
          '  sleep 5',
          'done',
          '',
          'echo "--- stdout ---"',
          'aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" --query "StandardOutputContent" --output text',
          'echo "--- stderr ---"',
          'aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" --query "StandardErrorContent" --output text',
          '',
          'if [ "$STATUS" != "Success" ]; then',
          '  echo "SSM deployment failed with status: $STATUS"',
          '  exit 1',
          'fi',
        ].join('\n'),
      },
    ];
  }
}

module.exports = DeployVmGenerator;