class DeployEksGenerator {
  constructor(eksClusterName) {
    this.eksClusterName = eksClusterName;
  }

  generate() {
    const clusterRef = this.eksClusterName
      ? this.eksClusterName
      : '${{ secrets.EKS_CLUSTER_NAME }}';

    return [
      {
        name: 'Update Kubeconfig for Amazon EKS',
        // This is perfectly correct: it interpolates clusterRef and escapes the GitHub secret syntax
        run: `aws eks update-kubeconfig --name ${clusterRef} --region \${{ secrets.AWS_REGION }}`,
      },
      {
        name: 'Deploy Manifests to Kubernetes',
        // FIX: Replaced the YAML pipe (|) and single quotes with JavaScript backticks (`)
        run: `kubectl apply -f k8s/namespace.yaml
        kubectl apply -f k8s/limitrange.yaml
        kubectl apply -f k8s/resourcequota.yaml
        kubectl apply -f k8s/`,
      },
    ];
  }
}

module.exports = DeployEksGenerator;