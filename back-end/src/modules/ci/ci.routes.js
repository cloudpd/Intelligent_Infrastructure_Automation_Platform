const express = require('express');
const ciController = require('./ci.controller');
const authenticate = require('../../core/middlewares/authenticate');
const router = express.Router();

router.use(authenticate);

router.post('/push-ci', ciController.pushToGithub);

module.exports = router;