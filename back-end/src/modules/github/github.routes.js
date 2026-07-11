const express = require('express');
const authenticate = require('../../core/middlewares/authenticate');
const {
  addTokenController,
  listTokensController,
  deleteTokenController,
} = require('./github.controller');

const router = express.Router();

router.use(authenticate); 

router.post('/tokens', addTokenController);
router.get('/tokens', listTokensController);
router.delete('/tokens/:id', deleteTokenController);

module.exports = router;