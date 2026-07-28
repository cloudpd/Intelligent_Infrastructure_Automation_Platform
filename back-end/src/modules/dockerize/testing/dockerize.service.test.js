jest.mock('../dockerize.model', () => ({
  BuildConfig: { findOrCreate: jest.fn(), findOne: jest.fn() },
}), { virtual: true });

jest.mock(
  '../../../core/utils/AppError',
  () => require('../../../core/test-utils/mocks.AppError'),
  { virtual: true }
);

jest.mock('../../github/github.service', () => ({
  getDecryptedToken: jest.fn(),
  parseRepoUrl: jest.fn(),
  pushFileToRepo: jest.fn(),
}), { virtual: true });

jest.mock('../../service/service.model', () => ({
  Service: { findOne: jest.fn() },
}), { virtual: true });

jest.mock('../../projects/projects.model', () => ({ Project: {} }), { virtual: true });

jest.mock('../dockerize.templates', () => ({
  renderDockerfile: jest.fn(),
}));

const { BuildConfig } = require('../dockerize.model');
const githubService = require('../../github/github.service');
const { Service } = require('../../service/service.model');
const { renderDockerfile } = require('../dockerize.templates');
const dockerizeService = require('../dockerize.service');

describe('dockerize.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markExistingDockerfile', () => {
    const userId = 'user-1';
    const payload = { service_id: 'svc-1', dockerfile_path: 'apps/api/Dockerfile' };

    it('throws a 404 AppError when the service is not owned by the user', async () => {
      Service.findOne.mockResolvedValue(null);

      await expect(dockerizeService.markExistingDockerfile(userId, payload)).rejects.toMatchObject({
        message: 'Service not found',
        statusCode: 404,
      });
      expect(BuildConfig.findOrCreate).not.toHaveBeenCalled();
    });

    it('finds/creates the build config and marks it as using an existing Dockerfile', async () => {
      Service.findOne.mockResolvedValue({ id: 'svc-1' });
      const config = { id: 'bc1', update: jest.fn().mockResolvedValue(true) };
      BuildConfig.findOrCreate.mockResolvedValue([config, true]);

      const result = await dockerizeService.markExistingDockerfile(userId, payload);

      expect(BuildConfig.findOrCreate).toHaveBeenCalledWith({
        where: { service_id: 'svc-1' },
        defaults: {
          service_id: 'svc-1',
          has_existing_dockerfile: true,
          dockerfile_path: 'apps/api/Dockerfile',
          status: 'completed',
        },
      });
      expect(config.update).toHaveBeenCalledWith({
        has_existing_dockerfile: true,
        dockerfile_path: 'apps/api/Dockerfile',
        language: null,
        status: 'completed',
      });
      expect(result).toBe(config);
    });
  });

  describe('generateAndPushDockerfile', () => {
    const userId = 'user-1';
    const data = {
      service_id: 'svc-1',
      github_token_id: 'tok-1',
      language: 'node',
      base_image: 'node:22-alpine',
      port: 3000,
      run_command: 'node index.js',
      target_path: 'Dockerfile',
    };

    it('throws a 404 AppError when the service is not owned by the user', async () => {
      Service.findOne.mockResolvedValue(null);

      await expect(dockerizeService.generateAndPushDockerfile(userId, data)).rejects.toMatchObject({
        message: 'Service not found',
        statusCode: 404,
      });
      expect(githubService.pushFileToRepo).not.toHaveBeenCalled();
    });

    it('renders the Dockerfile, pushes it to GitHub, and saves the build config', async () => {
      const service = { id: 'svc-1', repository_url: 'https://github.com/octocat/hello-world', branch: 'develop' };
      Service.findOne.mockResolvedValue(service);
      renderDockerfile.mockReturnValue('FROM node:22-alpine\n...');
      githubService.getDecryptedToken.mockResolvedValue('ghp_raw');
      githubService.parseRepoUrl.mockReturnValue({ owner: 'octocat', repo: 'hello-world' });
      githubService.pushFileToRepo.mockResolvedValue({ content: {} });
      const config = { id: 'bc1', update: jest.fn().mockResolvedValue(true) };
      BuildConfig.findOrCreate.mockResolvedValue([config, true]);

      const result = await dockerizeService.generateAndPushDockerfile(userId, data);

      // run_command is turned into a quoted, comma-separated array string
      expect(renderDockerfile).toHaveBeenCalledWith('node', {
        BASE_IMAGE: 'node:22-alpine',
        PORT: '3000',
        RUN_COMMAND: '"node", "index.js"',
      });
      expect(githubService.getDecryptedToken).toHaveBeenCalledWith(userId, 'tok-1');
      expect(githubService.parseRepoUrl).toHaveBeenCalledWith(service.repository_url);
      expect(githubService.pushFileToRepo).toHaveBeenCalledWith({
        accessToken: 'ghp_raw',
        owner: 'octocat',
        repo: 'hello-world',
        path: 'Dockerfile',
        content: 'FROM node:22-alpine\n...',
        branch: 'develop',
        commitMessage: 'Add Dockerfile via DeployHub (node)',
      });
      expect(BuildConfig.findOrCreate).toHaveBeenCalledWith({
        where: { service_id: 'svc-1' },
        defaults: {
          service_id: 'svc-1',
          has_existing_dockerfile: false,
          dockerfile_path: 'Dockerfile',
          language: 'node',
          status: 'completed',
        },
      });
      expect(config.update).toHaveBeenCalledWith({
        has_existing_dockerfile: false,
        dockerfile_path: 'Dockerfile',
        language: 'node',
        status: 'completed',
      });
      expect(result).toBe(config);
    });

    it('falls back to the "main" branch when the service has none set', async () => {
      Service.findOne.mockResolvedValue({ id: 'svc-1', repository_url: 'https://github.com/octocat/hello-world', branch: null });
      renderDockerfile.mockReturnValue('FROM node:22-alpine\n...');
      githubService.getDecryptedToken.mockResolvedValue('ghp_raw');
      githubService.parseRepoUrl.mockReturnValue({ owner: 'octocat', repo: 'hello-world' });
      githubService.pushFileToRepo.mockResolvedValue({});
      BuildConfig.findOrCreate.mockResolvedValue([{ update: jest.fn().mockResolvedValue(true) }, true]);

      await dockerizeService.generateAndPushDockerfile(userId, data);

      expect(githubService.pushFileToRepo).toHaveBeenCalledWith(
        expect.objectContaining({ branch: 'main' })
      );
    });
  });

  describe('getBuildConfigForService', () => {
    const userId = 'user-1';

    it('throws a 404 AppError when the service is not owned by the user', async () => {
      Service.findOne.mockResolvedValue(null);

      await expect(dockerizeService.getBuildConfigForService(userId, 'svc-1')).rejects.toMatchObject({
        message: 'Service not found',
        statusCode: 404,
      });
    });

    it('throws a 404 AppError when the service has no build config yet', async () => {
      Service.findOne.mockResolvedValue({ id: 'svc-1' });
      BuildConfig.findOne.mockResolvedValue(null);

      await expect(dockerizeService.getBuildConfigForService(userId, 'svc-1')).rejects.toMatchObject({
        message: 'This service has not completed the Dockerfile step yet',
        statusCode: 404,
      });
    });

    it('returns the build config when it exists', async () => {
      Service.findOne.mockResolvedValue({ id: 'svc-1' });
      const config = { id: 'bc1', status: 'completed' };
      BuildConfig.findOne.mockResolvedValue(config);

      const result = await dockerizeService.getBuildConfigForService(userId, 'svc-1');

      expect(BuildConfig.findOne).toHaveBeenCalledWith({ where: { service_id: 'svc-1' } });
      expect(result).toBe(config);
    });
  });
});