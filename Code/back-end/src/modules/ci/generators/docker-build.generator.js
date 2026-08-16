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

    // If ecrRepoName is the full URL from Terraform output (contains amazonaws.com),
    // use it directly. Otherwise prepend the ECR registry from the login step.
    const isFullUrl = ecrRepoName && ecrRepoName.includes('amazonaws.com');
    const imageBase = isFullUrl
      ? ecrRepoName                        // "123456789.dkr.ecr.us-east-1.amazonaws.com/my-repo"
      : ecrRepoName
        ? `${ecrRegistry}/${ecrRepoName}`  // pre-apply fallback: just the repo name
        : `${ecrRegistry}/${'${{ secrets.ECR_REPOSITORY }}'}`;  // no ECR config at all

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
