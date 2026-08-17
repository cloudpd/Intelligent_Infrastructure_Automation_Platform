class DockerBuildGenerator {
  constructor(imageName, registry, registryConfig) {
    this.imageName = imageName;
    this.registry = registry;
    this.registryConfig = registryConfig;
  }

  generateDockerHubBuild() {
    const sha = '${{ github.sha }}';
    // Use secret for Docker Hub username reference
    const imageTag = `${'${{ secrets.DOCKER_USERNAME }}'}/${this.imageName}:${sha}`;

    return {
      name: 'Build Docker Image',
      run: `docker build -t ${imageTag} -t ${'${{ secrets.DOCKER_USERNAME }}'}/${this.imageName}:latest .`,
    };
  }

  generateAWSECRBuild() {
    const sha = '${{ github.sha }}';
    const ecrRegistry = '${{ steps.login-ecr.outputs.registry }}';
    const ecrRepoName = this.registryConfig.ecrRepoName;

    const isFullUrl = ecrRepoName && ecrRepoName.includes('amazonaws.com');
    const imageBase = isFullUrl
      ? ecrRepoName
      : ecrRepoName
        ? `${ecrRegistry}/${ecrRepoName}`
        : `${ecrRegistry}/${'${{ secrets.ECR_REPOSITORY }}'}`;

    return {
      name: 'Build Docker Image',
      run: `docker build -t ${imageBase}:${sha} -t ${imageBase}:latest .`,
    };
  }

  generate() {
    if (this.registry === 'docker-hub') {
      return this.generateDockerHubBuild();
    } else if (this.registry === 'aws-ecr') {
      return this.generateAWSECRBuild();
    }
    throw new Error(`Unknown registry: ${this.registry}`);
  }
}

module.exports = DockerBuildGenerator;
