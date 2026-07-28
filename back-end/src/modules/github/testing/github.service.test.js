jest.mock('../github.model', () => ({
  GithubToken: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
  },
}), { virtual: true });

jest.mock('../../../core/utils/encryption', () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
}), { virtual: true });

jest.mock(
  '../../../core/utils/AppError',
  () => require('../../../core/test-utils/mocks.AppError'),
  { virtual: true }
);

const { GithubToken } = require('../github.model');
const { encrypt, decrypt } = require('../../../core/utils/encryption');
const githubService = require('../github.service');

describe('github.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveToken', () => {
    it('encrypts the raw token and stores it, returning only the safe fields', async () => {
      encrypt.mockReturnValue('encrypted-token');
      const created = {
        id: 't1',
        name: 'CI token',
        description: 'used for deploys',
        createdAt: '2024-01-01T00:00:00.000Z',
        user_id: 'user-1',
        token: 'encrypted-token',
      };
      GithubToken.create.mockResolvedValue(created);

      const result = await githubService.saveToken('user-1', 'CI token', 'ghp_raw', 'used for deploys');

      expect(encrypt).toHaveBeenCalledWith('ghp_raw');
      expect(GithubToken.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        name: 'CI token',
        token: 'encrypted-token',
        description: 'used for deploys',
      });
      expect(result).toEqual({
        id: 't1',
        name: 'CI token',
        description: 'used for deploys',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
      // the encrypted token and raw user_id must never leak into the response
      expect(result.token).toBeUndefined();
      expect(result.user_id).toBeUndefined();
    });
  });

  describe('listUserTokens', () => {
    it('returns the tokens for the given user, newest first, without the token column', async () => {
      const fakeTokens = [{ id: 't2' }, { id: 't1' }];
      GithubToken.findAll.mockResolvedValue(fakeTokens);

      const result = await githubService.listUserTokens('user-1');

      expect(GithubToken.findAll).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        attributes: ['id', 'name', 'description', 'createdAt'],
        order: [['createdAt', 'DESC']],
      });
      expect(result).toBe(fakeTokens);
    });
  });

  describe('deleteToken', () => {
    it('deletes the token scoped to the user', async () => {
      GithubToken.destroy.mockResolvedValue(1);

      await githubService.deleteToken('user-1', 't1');

      expect(GithubToken.destroy).toHaveBeenCalledWith({
        where: { id: 't1', user_id: 'user-1' },
      });
    });

    it('throws a 404 AppError when nothing was deleted (not found or not owned)', async () => {
      GithubToken.destroy.mockResolvedValue(0);

      await expect(githubService.deleteToken('user-1', 'missing')).rejects.toMatchObject({
        message: 'Token not found',
        statusCode: 404,
      });
    });
  });

  describe('getDecryptedToken', () => {
    it('returns the decrypted token when the record exists', async () => {
      GithubToken.findOne.mockResolvedValue({ id: 't1', token: 'encrypted-token' });
      decrypt.mockReturnValue('ghp_raw');

      const result = await githubService.getDecryptedToken('user-1', 't1');

      expect(GithubToken.findOne).toHaveBeenCalledWith({ where: { id: 't1', user_id: 'user-1' } });
      expect(decrypt).toHaveBeenCalledWith('encrypted-token');
      expect(result).toBe('ghp_raw');
    });

    it('throws a 404 AppError when the record does not exist', async () => {
      GithubToken.findOne.mockResolvedValue(null);

      await expect(githubService.getDecryptedToken('user-1', 'missing')).rejects.toMatchObject({
        message: 'Token not found',
        statusCode: 404,
      });
      expect(decrypt).not.toHaveBeenCalled();
    });
  });

  describe('parseRepoUrl', () => {
    it('parses an https URL', () => {
      expect(githubService.parseRepoUrl('https://github.com/octocat/hello-world')).toEqual({
        owner: 'octocat',
        repo: 'hello-world',
      });
    });

    it('parses an https URL with a trailing .git', () => {
      expect(githubService.parseRepoUrl('https://github.com/octocat/hello-world.git')).toEqual({
        owner: 'octocat',
        repo: 'hello-world',
      });
    });

    it('parses an SSH-style URL', () => {
      expect(githubService.parseRepoUrl('git@github.com:octocat/hello-world.git')).toEqual({
        owner: 'octocat',
        repo: 'hello-world',
      });
    });

    it('throws a 400 AppError for a non-GitHub URL', () => {
      expect(() => githubService.parseRepoUrl('https://gitlab.com/octocat/hello-world')).toThrow(
        'Invalid GitHub repository URL'
      );
      try {
        githubService.parseRepoUrl('not a url at all');
      } catch (err) {
        expect(err.statusCode).toBe(400);
      }
    });
  });

  describe('pushFileToRepo', () => {
    const baseArgs = {
      accessToken: 'ghp_token',
      owner: 'octocat',
      repo: 'hello-world',
      path: 'README.md',
      content: 'hello',
      branch: 'main',
    };

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      delete global.fetch;
    });

    it('creates a new file (no existing sha) when the GET lookup 404s', async () => {
      global.fetch
        .mockResolvedValueOnce({ status: 404 }) // GET lookup: file doesn't exist yet
        .mockResolvedValueOnce({ ok: true, json: async () => ({ content: { sha: 'new-sha' } }) }); // PUT

      const result = await githubService.pushFileToRepo(baseArgs);

      const [, putCall] = global.fetch.mock.calls;
      const putBody = JSON.parse(putCall[1].body);
      expect(putBody.sha).toBeUndefined();
      expect(putBody.content).toBe(Buffer.from('hello').toString('base64'));
      expect(putBody.message).toBe('Add README.md via DeployHub');
      expect(result).toEqual({ content: { sha: 'new-sha' } });
    });

    it('includes the existing sha when the file already exists', async () => {
      global.fetch
        .mockResolvedValueOnce({ status: 200, json: async () => ({ sha: 'existing-sha' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ content: { sha: 'updated-sha' } }) });

      await githubService.pushFileToRepo(baseArgs);

      const [, putCall] = global.fetch.mock.calls;
      const putBody = JSON.parse(putCall[1].body);
      expect(putBody.sha).toBe('existing-sha');
    });

    it('uses a custom commit message when provided', async () => {
      global.fetch
        .mockResolvedValueOnce({ status: 404 })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await githubService.pushFileToRepo({ ...baseArgs, commitMessage: 'Update readme' });

      const [, putCall] = global.fetch.mock.calls;
      const putBody = JSON.parse(putCall[1].body);
      expect(putBody.message).toBe('Update readme');
    });

    it('throws an AppError when the GET lookup fails with a non-404 status', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      await expect(githubService.pushFileToRepo(baseArgs)).rejects.toMatchObject({
        message: 'Server error',
        statusCode: 500,
      });
      expect(global.fetch).toHaveBeenCalledTimes(1); // PUT is never attempted
    });

    it('falls back to a default message when the GET error body has none', async () => {
      global.fetch.mockResolvedValueOnce({ status: 500, json: async () => ({}) });

      await expect(githubService.pushFileToRepo(baseArgs)).rejects.toMatchObject({
        message: 'Failed to check existing file on GitHub',
        statusCode: 500,
      });
    });

    it('throws an AppError when the PUT request fails', async () => {
      global.fetch
        .mockResolvedValueOnce({ status: 404 })
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: async () => ({ message: 'Invalid request' }),
        });

      await expect(githubService.pushFileToRepo(baseArgs)).rejects.toMatchObject({
        message: 'Invalid request',
        statusCode: 422,
      });
    });

    it('falls back to a default message when the PUT error body has none', async () => {
      global.fetch
        .mockResolvedValueOnce({ status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

      await expect(githubService.pushFileToRepo(baseArgs)).rejects.toMatchObject({
        message: 'Failed to push file to GitHub',
        statusCode: 500,
      });
    });
  });
});