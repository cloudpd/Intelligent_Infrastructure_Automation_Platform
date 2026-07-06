const express = require('express');
const { signupController, loginController, meController } = require('./auth.controller');
const authenticate = require('../../core/middlewares/authenticate');
const validate = require('../../core/middlewares/validate');
const { signupSchema, loginSchema } = require('./auth.validation');

const router = express.Router();

router.post('/signup', validate(signupSchema), signupController);
router.post('/login', validate(loginSchema), loginController);
router.get('/me', authenticate, meController);

module.exports = router;