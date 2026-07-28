jest.mock('../aws.service', () => ({
  createCredential: jest.fn(),
  getUserCredentials: jest.fn(),
  getCredentialById: jest.fn(),
  updateCredential: jest.fn(),
  deleteCredential: jest.fn(),
}));

const awsService = require('../aws.service');
const {
  createCredential,
  getUserCredentials,
  getCredentialById,
  updateCredential,
  deleteCredential,
} = require('../aws.controller');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('aws.controller', () => {
  const next = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCredential', () => {
    it('returns 201 with the created credential', async () => {
      const req = {
        user: { id: 'user-1' },
        body: { name: 'Prod', access_key: 'AKIAABCDEFGHIJKLMNOP', secret_key: 'a-very-secret-value' },
      };
      const res = buildRes();
      const credential = { id: 'cred-1', name: 'Prod', access_key: 'AKIAABCDEFGHIJKLMNOP' };
      awsService.createCredential.mockResolvedValue(credential);

      await createCredential(req, res, next);

      expect(awsService.createCredential).toHaveBeenCalledWith('user-1', req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: credential });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' }, body: { access_key: 'short', secret_key: 'short' } };
      const res = buildRes();
      const error = new Error('validation failed');
      awsService.createCredential.mockRejectedValue(error);

      await createCredential(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getUserCredentials', () => {
    it('returns 200 with the credentials and a result count', async () => {
      const req = { user: { id: 'user-1' } };
      const res = buildRes();
      const credentials = [{ id: 'c1' }, { id: 'c2' }];
      awsService.getUserCredentials.mockResolvedValue(credentials);

      await getUserCredentials(req, res, next);

      expect(awsService.getUserCredentials).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', results: 2, data: credentials });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns a result count of 0 for an empty list', async () => {
      const req = { user: { id: 'user-1' } };
      const res = buildRes();
      awsService.getUserCredentials.mockResolvedValue([]);

      await getUserCredentials(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ status: 'success', results: 0, data: [] });
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' } };
      const res = buildRes();
      const error = new Error('DB down');
      awsService.getUserCredentials.mockRejectedValue(error);

      await getUserCredentials(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getCredentialById', () => {
    it('returns 200 with the requested credential', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'cred-1' } };
      const res = buildRes();
      const credential = { id: 'cred-1', name: 'Prod' };
      awsService.getCredentialById.mockResolvedValue(credential);

      await getCredentialById(req, res, next);

      expect(awsService.getCredentialById).toHaveBeenCalledWith('user-1', 'cred-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: credential });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next() (e.g. not found)', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'missing' } };
      const res = buildRes();
      const error = new Error('AWS credential not found');
      awsService.getCredentialById.mockRejectedValue(error);

      await getCredentialById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateCredential', () => {
    it('returns 200 with the updated credential', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'cred-1' }, body: { name: 'Renamed' } };
      const res = buildRes();
      const credential = { id: 'cred-1', name: 'Renamed' };
      awsService.updateCredential.mockResolvedValue(credential);

      await updateCredential(req, res, next);

      expect(awsService.updateCredential).toHaveBeenCalledWith('user-1', 'cred-1', { name: 'Renamed' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: credential });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'cred-1' }, body: { name: 'X' } };
      const res = buildRes();
      const error = new Error('AWS credential not found');
      awsService.updateCredential.mockRejectedValue(error);

      await updateCredential(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('deleteCredential', () => {
    it('returns 204 with a null data payload', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'cred-1' } };
      const res = buildRes();
      awsService.deleteCredential.mockResolvedValue(true);

      await deleteCredential(req, res, next);

      expect(awsService.deleteCredential).toHaveBeenCalledWith('user-1', 'cred-1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: null });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next() (e.g. not found)', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'missing' } };
      const res = buildRes();
      const error = new Error('AWS credential not found');
      awsService.deleteCredential.mockRejectedValue(error);

      await deleteCredential(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});