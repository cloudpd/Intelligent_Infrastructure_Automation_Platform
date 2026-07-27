jest.mock('../auth.service', () => ({
  signup: jest.fn(),
  login: jest.fn(),
  findUserById: jest.fn(),
}));

const authService = require('../auth.service');
const { signupController, loginController, meController } = require('../auth.controller');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('auth.controller', () => {
  const next = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signupController', () => {
    it('returns 201 with the created user and accessToken', async () => {
      const req = { body: { name: 'John Doe', email: 'john@example.com', password: 'Passw0rd' } };
      const res = buildRes();
      const serviceResult = { user: { id: 1, name: 'John Doe' }, accessToken: 'token' };
      authService.signup.mockResolvedValue(serviceResult);

      await signupController(req, res, next);

      expect(authService.signup).toHaveBeenCalledWith('John Doe', 'john@example.com', 'Passw0rd');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, ...serviceResult });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next() (e.g. duplicate email conflict)', async () => {
      const req = { body: { name: 'John Doe', email: 'john@example.com', password: 'Passw0rd' } };
      const res = buildRes();
      const error = new Error('email already exists');
      authService.signup.mockRejectedValue(error);

      await signupController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('loginController', () => {
    it('returns 200 with the user and accessToken', async () => {
      const req = { body: { email: 'john@example.com', password: 'Passw0rd' } };
      const res = buildRes();
      const serviceResult = { user: { id: 1, name: 'John Doe' }, accessToken: 'token' };
      authService.login.mockResolvedValue(serviceResult);

      await loginController(req, res, next);

      expect(authService.login).toHaveBeenCalledWith('john@example.com', 'Passw0rd');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, ...serviceResult });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next() (e.g. invalid credentials)', async () => {
      const req = { body: { email: 'john@example.com', password: 'wrong' } };
      const res = buildRes();
      const error = new Error('invalid credentials');
      authService.login.mockRejectedValue(error);

      await loginController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('meController', () => {
    it('returns 200 with the current user', async () => {
      const req = { user: { id: 42 } };
      const res = buildRes();
      const user = { id: 42, name: 'John Doe', email: 'john@example.com', role: 'user' };
      authService.findUserById.mockResolvedValue(user);

      await meController(req, res, next);

      expect(authService.findUserById).toHaveBeenCalledWith(42);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, user });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next() (e.g. user not found)', async () => {
      const req = { user: { id: 999 } };
      const res = buildRes();
      const error = new Error('user not found');
      authService.findUserById.mockRejectedValue(error);

      await meController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
