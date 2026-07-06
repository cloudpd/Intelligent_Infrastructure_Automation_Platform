const authService = require('./auth.service');

async function signupController(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.signup(name, email, password);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function loginController(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function meController(req, res, next) {
  try {
    const user = await authService.findUserById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

module.exports = { signupController, loginController, meController };