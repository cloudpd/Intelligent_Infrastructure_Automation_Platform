jest.mock('../dockerize.service', () => ({
  markExistingDockerfile: jest.fn(),
  generateAndPushDockerfile: jest.fn(),
  getBuildConfigForService: jest.fn(),
}));

jest.mock('../dockerize.templates', () => ({
  getDefaultsForLanguage: jest.fn(),
  renderDockerfile: jest.fn(),
}));

const dockerizeService = require('../dockerize.service');
const { getDefaultsForLanguage } = require('../dockerize.templates');
const {
  markExistingController,
  getLanguageDefaultsController,
  generateController,
  getBuildConfigController,
} = require('../dockerize.controller');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('dockerize.controller', () => {
  const next = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markExistingController', () => {
    it('returns 200 with the build config', async () => {
      const req = {
        user: { id: 'user-1' },
        body: { service_id: 'svc-1', dockerfile_path: 'Dockerfile' },
      };
      const res = buildRes();
      const config = { id: 'bc1', has_existing_dockerfile: true };
      dockerizeService.markExistingDockerfile.mockResolvedValue(config);

      await markExistingController(req, res, next);

      expect(dockerizeService.markExistingDockerfile).toHaveBeenCalledWith('user-1', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, buildConfig: config });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next() (e.g. service not found)', async () => {
      const req = { user: { id: 'user-1' }, body: { service_id: 'missing' } };
      const res = buildRes();
      const error = new Error('Service not found');
      dockerizeService.markExistingDockerfile.mockRejectedValue(error);

      await markExistingController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getLanguageDefaultsController', () => {
    it('returns 200 with the defaults for the requested language', async () => {
      const req = { params: { language: 'node' } };
      const res = buildRes();
      const defaults = { BASE_IMAGE: 'node:22-alpine', PORT: '3000', RUN_COMMAND: '"node", "index.js"' };
      getDefaultsForLanguage.mockReturnValue(defaults);

      await getLanguageDefaultsController(req, res, next);

      expect(getDefaultsForLanguage).toHaveBeenCalledWith('node');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, defaults });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next() (e.g. unsupported language)', async () => {
      const req = { params: { language: 'ruby' } };
      const res = buildRes();
      const error = new Error('No defaults found for language: ruby');
      getDefaultsForLanguage.mockImplementation(() => {
        throw error;
      });

      await getLanguageDefaultsController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('generateController', () => {
    it('returns 201 with the build config', async () => {
      const req = {
        user: { id: 'user-1' },
        body: { service_id: 'svc-1', language: 'node', github_token_id: 'tok-1' },
      };
      const res = buildRes();
      const config = { id: 'bc1', language: 'node' };
      dockerizeService.generateAndPushDockerfile.mockResolvedValue(config);

      await generateController(req, res, next);

      expect(dockerizeService.generateAndPushDockerfile).toHaveBeenCalledWith('user-1', req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, buildConfig: config });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next() (e.g. push to GitHub failed)', async () => {
      const req = { user: { id: 'user-1' }, body: { service_id: 'svc-1' } };
      const res = buildRes();
      const error = new Error('Failed to push file to GitHub');
      dockerizeService.generateAndPushDockerfile.mockRejectedValue(error);

      await generateController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getBuildConfigController', () => {
    it('returns 200 with the build config for the service', async () => {
      const req = { user: { id: 'user-1' }, params: { serviceId: 'svc-1' } };
      const res = buildRes();
      const config = { id: 'bc1', status: 'completed' };
      dockerizeService.getBuildConfigForService.mockResolvedValue(config);

      await getBuildConfigController(req, res, next);

      expect(dockerizeService.getBuildConfigForService).toHaveBeenCalledWith('user-1', 'svc-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, buildConfig: config });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next() (e.g. build config not found)', async () => {
      const req = { user: { id: 'user-1' }, params: { serviceId: 'svc-missing' } };
      const res = buildRes();
      const error = new Error('This service has not completed the Dockerfile step yet');
      dockerizeService.getBuildConfigForService.mockRejectedValue(error);

      await getBuildConfigController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});