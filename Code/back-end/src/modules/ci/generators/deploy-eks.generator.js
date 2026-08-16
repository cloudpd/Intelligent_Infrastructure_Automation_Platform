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
        run: `aws eks update-kubeconfig --name ${clusterRef} --region \${{ secrets.AWS_REGION }}`,
      },
      {
        name: 'Deploy Manifests to Kubernetes',
        run: 'kubectl apply -f k8s/',
      },
    ];
  }
}

module.exports = DeployEksGenerator;
