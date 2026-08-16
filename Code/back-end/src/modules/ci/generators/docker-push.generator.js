class DockerPushGenerator {
  constructor(imageName, registry, registryConfig) {
    this.imageName = imageName;
    this.registry = registry;
    this.registryConfig = registryConfig;
  }

  generateDockerHubPush() {
    const sha = '${{ github.sha }}';
    const imageRef = `${'${{ secrets.DOCKER_USERNAME }}'}/${this.imageName}`;
    return {
      name: 'Push to Docker Hub',
      run: `docker push ${imageRef}:${sha} && docker push ${imageRef}:latest`,
    };
  }

  generateAWSECRPush() {
    const sha = '${{ github.sha }}';
    const ecrRegistry = '${{ steps.login-ecr.outputs.registry }}';
    const ecrRepo = '${{ secrets.ECR_REPOSITORY }}';
    return {
      name: 'Push to AWS ECR',
      run: `docker push ${ecrRegistry}/${ecrRepo}:${sha} && docker push ${ecrRegistry}/${ecrRepo}:latest`,
    };
  }

  generate() {
    if (this.registry === 'docker-hub') return this.generateDockerHubPush();
    if (this.registry === 'aws-ecr') return this.generateAWSECRPush();
    throw new Error(`Unknown registry: ${this.registry}`);
  }
}

module.exports = DockerPushGenerator;
