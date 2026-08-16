const githubService = require('./github.service');

async function addTokenController(req, res, next) {
  try {
    const { name, token, description } = req.body;
    const savedToken = await githubService.saveToken(req.user.id, name, token, description);
    res.status(201).json({ success: true, token: savedToken });
  } catch (err) {
    next(err);
  }
}

async function listTokensController(req, res, next) {
  try {
    const tokens = await githubService.listUserTokens(req.user.id);
    res.status(200).json({ success: true, tokens });
  } catch (err) {
    next(err);
  }
}

async function deleteTokenController(req, res, next) {
  try {
    const { id } = req.params;
    await githubService.deleteToken(req.user.id, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function pushRepoSecretsController(req, res, next) {
  try {
    const { serviceId } = req.params;
    const { secrets } = req.body || {};

    const result = await githubService.pushRepoSecrets({
      userId: req.user.id,
      serviceId,
      secrets,
    });

    res.status(200).json({ success: true, result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addTokenController,
  listTokensController,
  deleteTokenController,
  pushRepoSecretsController,
};