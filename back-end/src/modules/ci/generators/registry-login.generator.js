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
        username: '${{ secrets.DOCKER_USERNAME }}',
        password: '${{ secrets.DOCKER_PASSWORD }}',
      },
    };
  }

  generateAWSECRLogin() {
    return [
      {
        name: 'Configure AWS Credentials',
        uses: 'aws-actions/configure-aws-credentials@v4',
        with: {
          'aws-access-key-id': '${{ secrets.AWS_ACCESS_KEY_ID }}',
          'aws-secret-access-key': '${{ secrets.AWS_SECRET_ACCESS_KEY }}',
          'aws-region': '${{ secrets.AWS_REGION }}',
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
      return this.generateAWSECRLogin();
    }

    throw new Error(`Unknown registry: ${this.registry}`);
  }
}

module.exports = RegistryLoginGenerator;
