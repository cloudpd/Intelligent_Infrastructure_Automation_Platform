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
    const remoteCommands = [
      'set -e',
      'mkdir -p /tmp/k8s-deploy',
      'cd /tmp/k8s-deploy', // FIX: Change into the directory so relative paths work
      // FIX: Use GitHub Actions syntax to inject the environment variable into the single-quoted JSON string
      'echo "${{ env.MANIFEST_B64 }}" | base64 -d | tar -xzf -', 
      'export KUBECONFIG=/root/.kube/config',
      `kubectl config use-context kind-${this.kindClusterName}`,
      // FIX: Broke these out into proper individual string commands (removed "run: `")
      'kubectl apply -f k8s/namespace.yaml',
      'kubectl apply -f k8s/limitrange.yaml',
      'kubectl apply -f k8s/resourcequota.yaml',
      'kubectl apply -f k8s/'
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