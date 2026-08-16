const express = require('express');
const authenticate = require('../../core/middlewares/authenticate');
const validate = require('../../core/middlewares/validate');
const { pushRepoSecretsSchema } = require('./github.validation');
const {
  addTokenController,
  listTokensController,
  deleteTokenController,
  pushRepoSecretsController,
} = require('./github.controller');

const router = express.Router();

router.use(authenticate);

router.post('/tokens', addTokenController);
router.get('/tokens', listTokensController);
router.delete('/tokens/:id', deleteTokenController);
router.post('/:serviceId/secrets', validate(pushRepoSecretsSchema), pushRepoSecretsController);

module.exports = router;