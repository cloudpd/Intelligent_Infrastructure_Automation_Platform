jest.mock('../github.service', () => ({
  saveToken: jest.fn(),
  listUserTokens: jest.fn(),
  deleteToken: jest.fn(),
}));

const githubService = require('../github.service');
const {
  addTokenController,
  listTokensController,
  deleteTokenController,
} = require('../github.controller');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('github.controller', () => {
  const next = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addTokenController', () => {
    it('returns 201 with the saved token', async () => {
      const req = {
        user: { id: 'user-1' },
        body: { name: 'CI token', token: 'ghp_raw', description: 'used for deploys' },
      };
      const res = buildRes();
      const savedToken = { id: 't1', name: 'CI token', description: 'used for deploys', createdAt: 'now' };
      githubService.saveToken.mockResolvedValue(savedToken);

      await addTokenController(req, res, next);

      expect(githubService.saveToken).toHaveBeenCalledWith(
        'user-1',
        'CI token',
        'ghp_raw',
        'used for deploys'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, token: savedToken });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' }, body: { name: 'CI token', token: 'ghp_raw' } };
      const res = buildRes();
      const error = new Error('encryption failed');
      githubService.saveToken.mockRejectedValue(error);

      await addTokenController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('listTokensController', () => {
    it('returns 200 with the list of tokens', async () => {
      const req = { user: { id: 'user-1' } };
      const res = buildRes();
      const tokens = [{ id: 't1' }, { id: 't2' }];
      githubService.listUserTokens.mockResolvedValue(tokens);

      await listTokensController(req, res, next);

      expect(githubService.listUserTokens).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, tokens });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' } };
      const res = buildRes();
      const error = new Error('DB down');
      githubService.listUserTokens.mockRejectedValue(error);

      await listTokensController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('deleteTokenController', () => {
    it('returns 204 with no body on success', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 't1' } };
      const res = buildRes();
      githubService.deleteToken.mockResolvedValue(undefined);

      await deleteTokenController(req, res, next);

      expect(githubService.deleteToken).toHaveBeenCalledWith('user-1', 't1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
      expect(res.json).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next() (e.g. token not found)', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'missing' } };
      const res = buildRes();
      const error = new Error('Token not found');
      githubService.deleteToken.mockRejectedValue(error);

      await deleteTokenController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.send).not.toHaveBeenCalled();
    });
  });
});