const REGISTRY_TYPES = {
  DOCKER: "docker",
  AWS_ECR: "aws-ecr",
};

const REGISTRY_SECRETS_MAP = {
  [REGISTRY_TYPES.DOCKER]: {
    required: ["DOCKER_USERNAME", "DOCKER_PASSWORD"],
  },
  [REGISTRY_TYPES.AWS_ECR]: {
    required: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "ECR_REPOSITORY"],
  },
};

function getRequiredSecrets(registry) {
  const config = REGISTRY_SECRETS_MAP[registry];
  if (!config) throw new AppError(`Unsupported registry type: ${registry}`, 400);
  return config.required;
}

module.exports = { REGISTRY_TYPES, REGISTRY_SECRETS_MAP, getRequiredSecrets };