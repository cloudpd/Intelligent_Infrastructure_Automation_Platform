jest.mock('bcrypt');

jest.mock('../auth.model', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
  },
}), { virtual: true });

jest.mock('../../../core/utils/jwt', () => ({ signAccessToken: jest.fn() }), { virtual: true });

jest.mock(
  '../../../core/utils/AppError',
  () => require('../../../core/test-utils/mocks.AppError'),
  { virtual: true }
);

const bcrypt = require('bcrypt');
const { User } = require('../auth.model');
const { signAccessToken } = require('../../../core/utils/jwt');
const authService = require('../auth.service');

describe('auth.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const name = 'John Doe';
    const email = 'john@example.com';
    const password = 'Passw0rd';

    it('creates the user, hashes the password, and returns user + accessToken', async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      const createdUser = { id: 42, name, email, role: 'user', password_hash: 'hashed-password' };
      User.create.mockResolvedValue(createdUser);
      signAccessToken.mockReturnValue('signed.jwt.token');

      const result = await authService.signup(name, email, password);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(User.create).toHaveBeenCalledWith({ name, email, password_hash: 'hashed-password' });
      expect(signAccessToken).toHaveBeenCalledWith(createdUser.id);
      expect(result).toEqual({
        user: { id: 42, name, email, role: 'user' },
        accessToken: 'signed.jwt.token',
      });
      // password_hash must never leak into the returned user object
      expect(result.user.password_hash).toBeUndefined();
    });

    it('throws a 409 AppError when the email is already registered', async () => {
      User.findOne.mockResolvedValue({ id: 1, email });

      await expect(authService.signup(name, email, password)).rejects.toMatchObject({
        message: 'An account with this email already exists',
        statusCode: 409,
      });
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const email = 'john@example.com';
    const password = 'Passw0rd';
    const existingUser = { id: 42, name: 'John Doe', email, role: 'user', password_hash: 'hashed' };

    it('returns user + accessToken on successful login', async () => {
      User.findOne.mockResolvedValue(existingUser);
      bcrypt.compare.mockResolvedValue(true);
      signAccessToken.mockReturnValue('signed.jwt.token');

      const result = await authService.login(email, password);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, existingUser.password_hash);
      expect(signAccessToken).toHaveBeenCalledWith(existingUser.id);
      expect(result).toEqual({
        user: { id: 42, name: 'John Doe', email, role: 'user' },
        accessToken: 'signed.jwt.token',
      });
    });

    it('throws a 401 AppError when the user does not exist', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('throws a 401 AppError when the password is incorrect', async () => {
      User.findOne.mockResolvedValue(existingUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(email, password)).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
      });
    });
  });

  describe('findUserById', () => {
    it('returns the user when found', async () => {
      const user = { id: 42, name: 'John Doe', email: 'john@example.com', role: 'user' };
      User.findByPk.mockResolvedValue(user);

      const result = await authService.findUserById(42);

      expect(User.findByPk).toHaveBeenCalledWith(42, { attributes: ['id', 'name', 'email', 'role'] });
      expect(result).toEqual(user);
    });

    it('throws a 404 AppError when the user is not found', async () => {
      User.findByPk.mockResolvedValue(null);

      await expect(authService.findUserById(999)).rejects.toMatchObject({
        message: 'User not found',
        statusCode: 404,
      });
    });
  });
});