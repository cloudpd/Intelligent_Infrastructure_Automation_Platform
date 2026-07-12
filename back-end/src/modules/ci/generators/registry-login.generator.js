class RegistryLoginGenerator {
  constructor(registry, registryConfig) {
    this.registry = registry;
    this.registryConfig = registryConfig;
  }

  generateDockerHubLogin() {
    return {
      name: 'Login to Docker Hub',
      uses: 'docker/login-action@v3',
      with: {
        username: '${{ secrets.DOCKER_HUB_USERNAME }}',
        password: '${{ secrets.DOCKER_HUB_PASSWORD }}',
      },
    };
  }

  generateAWSECRLogin(region) {
    return [
      {
        name: 'Configure AWS Credentials',
        uses: 'aws-actions/configure-aws-credentials@v4',
        with: {
          'aws-access-key-id': '${{ secrets.AWS_ACCESS_KEY_ID }}',
          'aws-secret-access-key': '${{ secrets.AWS_SECRET_ACCESS_KEY }}',
          'aws-region': region,
        },
      },
      {
        name: 'Login to Amazon ECR',
        id: 'login-ecr',
        uses: 'aws-actions/amazon-ecr-login@v2',
      },
    ];
  }

  generate() {
    if (this.registry === 'docker-hub') {
      return this.generateDockerHubLogin();
    }

    if (this.registry === 'aws-ecr') {
      return this.generateAWSECRLogin(this.registryConfig.awsEcrRegion);
    }

    throw new Error(`Unknown registry: ${this.registry}`);
  }
}

module.exports = RegistryLoginGenerator;
