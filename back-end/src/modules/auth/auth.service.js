const bcrypt = require('bcrypt');
const { User } = require('./auth.model');
const { signAccessToken } = require('../../core/utils/jwt');
const AppError = require('../../core/utils/AppError');

const SALT_ROUNDS = 10;

async function signup(name, email, password) {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, password_hash });

  const accessToken = signAccessToken(user.id);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
  };
}

async function login(email, password) {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const accessToken = signAccessToken(user.id);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
  };
}

async function findUserById(id) {
  const user = await User.findByPk(id, { attributes: ['id', 'name', 'email', 'role'] });
  if (!user) throw new AppError('User not found', 404);
  return user;
}

module.exports = { signup, login, findUserById };