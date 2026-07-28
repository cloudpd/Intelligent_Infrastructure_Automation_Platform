jest.mock('../aws.model', () => ({
  AwsCredential: {
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

const { AwsCredential } = require('../aws.model');
const { encrypt, decrypt } = require('../../../core/utils/encryption');
const awsService = require('../aws.service');

// Simulates a Sequelize model instance: dot-property access works directly,
// and toJSON() returns the plain attributes (including secret_key), the
// same shape `sanitize()` in the service expects to strip from.
function fakeInstance(attrs) {
  return { ...attrs, toJSON: () => ({ ...attrs }) };
}

describe('aws.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCredential', () => {
    it('encrypts the secret key, creates the record, and strips secret_key from the response', async () => {
      encrypt.mockReturnValue('encrypted-secret');
      const created = fakeInstance({
        id: 'cred-1',
        user_id: 'user-1',
        name: 'Prod',
        access_key: 'AKIAABCDEFGHIJKLMNOP',
        secret_key: 'encrypted-secret',
      });
      AwsCredential.create.mockResolvedValue(created);

      const result = await awsService.createCredential('user-1', {
        name: 'Prod',
        access_key: 'AKIAABCDEFGHIJKLMNOP',
        secret_key: 'raw-secret-value',
      });

      expect(encrypt).toHaveBeenCalledWith('raw-secret-value');
      expect(AwsCredential.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        name: 'Prod',
        access_key: 'AKIAABCDEFGHIJKLMNOP',
        secret_key: 'encrypted-secret',
      });
      expect(result).toEqual({
        id: 'cred-1',
        user_id: 'user-1',
        name: 'Prod',
        access_key: 'AKIAABCDEFGHIJKLMNOP',
      });
      expect(result.secret_key).toBeUndefined();
    });
  });

  describe('getUserCredentials', () => {
    it('returns all of the user\'s credentials, newest first, without secret_key', async () => {
      const credentials = [
        fakeInstance({ id: 'c2', secret_key: 'enc-2' }),
        fakeInstance({ id: 'c1', secret_key: 'enc-1' }),
      ];
      AwsCredential.findAll.mockResolvedValue(credentials);

      const result = await awsService.getUserCredentials('user-1');

      expect(AwsCredential.findAll).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        order: [['createdAt', 'DESC']],
      });
      expect(result).toEqual([{ id: 'c2' }, { id: 'c1' }]);
      expect(result.every((c) => c.secret_key === undefined)).toBe(true);
    });

    it('returns an empty array when the user has no credentials', async () => {
      AwsCredential.findAll.mockResolvedValue([]);
      const result = await awsService.getUserCredentials('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('getCredentialById', () => {
    it('returns the sanitized credential when found', async () => {
      const credential = fakeInstance({ id: 'cred-1', name: 'Prod', secret_key: 'enc' });
      AwsCredential.findOne.mockResolvedValue(credential);

      const result = await awsService.getCredentialById('user-1', 'cred-1');

      expect(AwsCredential.findOne).toHaveBeenCalledWith({
        where: { id: 'cred-1', user_id: 'user-1' },
      });
      expect(result).toEqual({ id: 'cred-1', name: 'Prod' });
    });

    it('throws a 404 AppError when the credential does not exist', async () => {
      AwsCredential.findOne.mockResolvedValue(null);

      await expect(awsService.getCredentialById('user-1', 'missing')).rejects.toMatchObject({
        message: 'AWS credential not found',
        statusCode: 404,
      });
    });
  });

  describe('getDecryptedCredential', () => {
    it('returns the decrypted secret alongside the id, name, and access key', async () => {
      // Unlike sanitize(), this path reads properties straight off the
      // instance rather than calling toJSON(), so a plain object is enough.
      const credential = { id: 'cred-1', name: 'Prod', access_key: 'AKIA...', secret_key: 'enc' };
      AwsCredential.findOne.mockResolvedValue(credential);
      decrypt.mockReturnValue('raw-secret-value');

      const result = await awsService.getDecryptedCredential('user-1', 'cred-1');

      expect(decrypt).toHaveBeenCalledWith('enc');
      expect(result).toEqual({
        id: 'cred-1',
        name: 'Prod',
        access_key: 'AKIA...',
        secret_key: 'raw-secret-value',
      });
    });

    it('throws a 404 AppError when the credential does not exist', async () => {
      AwsCredential.findOne.mockResolvedValue(null);

      await expect(awsService.getDecryptedCredential('user-1', 'missing')).rejects.toMatchObject({
        message: 'AWS credential not found',
        statusCode: 404,
      });
      expect(decrypt).not.toHaveBeenCalled();
    });
  });

  describe('updateCredential', () => {
    it('updates only the fields provided and re-encrypts a new secret key', async () => {
      const credential = fakeInstance({
        id: 'cred-1',
        name: 'Old name',
        access_key: 'OLDKEY0000000000000',
        secret_key: 'old-encrypted',
      });
      credential.save = jest.fn().mockResolvedValue(true);
      AwsCredential.findOne.mockResolvedValue(credential);
      encrypt.mockReturnValue('new-encrypted');

      const result = await awsService.updateCredential('user-1', 'cred-1', {
        name: 'New name',
        secret_key: 'new-raw-secret',
      });

      expect(encrypt).toHaveBeenCalledWith('new-raw-secret');
      expect(credential.name).toBe('New name');
      expect(credential.access_key).toBe('OLDKEY0000000000000'); // untouched
      expect(credential.secret_key).toBe('new-encrypted');
      expect(credential.save).toHaveBeenCalled();
      expect(result.secret_key).toBeUndefined();
    });

    it('leaves fields untouched when they are not present in the payload', async () => {
      const credential = fakeInstance({ id: 'cred-1', name: 'Keep me', access_key: 'KEEPKEY000000000000', secret_key: 'enc' });
      credential.save = jest.fn().mockResolvedValue(true);
      AwsCredential.findOne.mockResolvedValue(credential);

      await awsService.updateCredential('user-1', 'cred-1', {});

      expect(credential.name).toBe('Keep me');
      expect(credential.access_key).toBe('KEEPKEY000000000000');
      expect(encrypt).not.toHaveBeenCalled();
      expect(credential.save).toHaveBeenCalled();
    });

    it('throws a 404 AppError when the credential does not exist', async () => {
      AwsCredential.findOne.mockResolvedValue(null);

      await expect(
        awsService.updateCredential('user-1', 'missing', { name: 'X' })
      ).rejects.toMatchObject({ message: 'AWS credential not found', statusCode: 404 });
    });
  });

  describe('deleteCredential', () => {
    it('returns true when the credential was deleted', async () => {
      AwsCredential.destroy.mockResolvedValue(1);

      const result = await awsService.deleteCredential('user-1', 'cred-1');

      expect(AwsCredential.destroy).toHaveBeenCalledWith({
        where: { id: 'cred-1', user_id: 'user-1' },
      });
      expect(result).toBe(true);
    });

    it('throws a 404 AppError when nothing was deleted (not found or not owned)', async () => {
      AwsCredential.destroy.mockResolvedValue(0);

      await expect(awsService.deleteCredential('user-1', 'missing')).rejects.toMatchObject({
        message: 'AWS credential not found',
        statusCode: 404,
      });
    });
  });
});