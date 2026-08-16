jest.mock('../terraform.service', () => ({
  applyGeneratedFiles: jest.fn(),
  generateNetworkFiles: jest.fn(),
  generateEcrFiles: jest.fn(),
  generateEksFiles: jest.fn(),
  generateVmFiles: jest.fn(),
  generateServiceFiles: jest.fn(),
  writeToDisk: jest.fn(),
}));

jest.mock('../../EKS/eks.service', () => ({
  getOwnedCluster: jest.fn(),
  markApplying: jest.fn(),
  markApplied: jest.fn(),
  markFailed: jest.fn(),
}));

jest.mock('../../vm/vm.service', () => ({
  getOwnedVm: jest.fn(),
  markApplying: jest.fn(),
  markApplied: jest.fn(),
  markFailed: jest.fn(),
}));

jest.mock('../../aws/aws.service', () => ({
  getDecryptedCredential: jest.fn(),
}));

jest.mock('../../../../core/utils/AppError', () => {
  return class AppError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
      this.statusCode = status;
    }
  };
});

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

const terraformController = require('../terraform.controller');
const terraformService = require('../terraform.service');
const eksService = require('../../EKS/eks.service');
const awsService = require('../../aws/aws.service');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('terraform.controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts an EKS apply flow and returns 202 while marking the cluster as applying', async () => {
    const req = {
      params: { clusterId: 'cluster-123' },
      body: { serviceSlug: 'service', environment: 'dev', awsCredentialId: 'cred-1' },
      user: { id: 'user-1' },
    };
    const res = buildRes();
    const next = jest.fn();

    eksService.getOwnedCluster.mockResolvedValue({ id: 'cluster-123', region: 'us-east-1' });
    awsService.getDecryptedCredential.mockResolvedValue({ access_key: 'AKIA', secret_key: 'SECRET' });
    terraformService.applyGeneratedFiles.mockResolvedValue({});

    await terraformController.applyEksFiles(req, res, next);

    expect(eksService.markApplying).toHaveBeenCalledWith('cluster-123');
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Terraform apply started', status: 'applying' });
    expect(next).not.toHaveBeenCalled();
  });
});
