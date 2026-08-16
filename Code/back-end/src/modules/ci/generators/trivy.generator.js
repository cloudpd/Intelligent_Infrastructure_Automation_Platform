class TrivyGenerator {
  constructor(imageName, registry, registryConfig) {
    this.imageName = imageName;
    this.registry = registry;
    this.registryConfig = registryConfig;
  }

  generateForDockerHub() {
    const sha = '${{ github.sha }}';
    const imageTag = `${'${{ secrets.DOCKER_USERNAME }}'}/${this.imageName}:${sha}`;

    return {
      name: 'Scan Image with Trivy',
      uses: 'aquasecurity/trivy-action@master',
      with: {
        'image-ref': imageTag,
        format: 'sarif',
        output: 'trivy-results.sarif',
        severity: 'CRITICAL,HIGH',
      },
    };
  }

  generateForAWSECR() {
    const sha = '${{ github.sha }}';
    const ecrRegistry = '${{ steps.login-ecr.outputs.registry }}';
    const ecrRepoName = this.registryConfig.ecrRepoName;

    // If ecrRepoName is the full URL from Terraform output, use it directly
    const isFullUrl = ecrRepoName && ecrRepoName.includes('amazonaws.com');
    const imageBase = isFullUrl
      ? ecrRepoName
      : ecrRepoName
        ? `${ecrRegistry}/${ecrRepoName}`
        : `${ecrRegistry}/${'${{ secrets.ECR_REPOSITORY }}'}`;

    return {
      name: 'Scan Image with Trivy',
      uses: 'aquasecurity/trivy-action@master',
      with: {
        'image-ref': `${imageBase}:${sha}`,
        format: 'sarif',
        output: 'trivy-results.sarif',
        severity: 'CRITICAL,HIGH',
      },
    };
  }

  generate() {
    if (this.registry === 'docker-hub') return this.generateForDockerHub();
    if (this.registry === 'aws-ecr') return this.generateForAWSECR();
    throw new Error(`Unknown registry: ${this.registry}`);
  }
}

module.exports = TrivyGenerator;
