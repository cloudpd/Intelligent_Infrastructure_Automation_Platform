const dockerizeService = require('./dockerize.service');
const { getDefaultsForLanguage } = require('./dockerize.templates');
const AppError = require('../../core/utils/AppError');

async function markExistingController(req, res, next) {
  try {
    const config = await dockerizeService.markExistingDockerfile(req.user.id, req.body);
    res.status(200).json({ success: true, buildConfig: config });
  } catch (err) {
    next(err);
  }
}

async function getLanguageDefaultsController(req, res, next) {
  try {
    const { language } = req.params;
    const defaults = getDefaultsForLanguage(language);
    res.status(200).json({ success: true, defaults });
  } catch (err) {
    next(err);
  }
}

async function generateController(req, res, next) {
  try {
    const config = await dockerizeService.generateAndPushDockerfile(req.user.id, req.body);
    res.status(201).json({ success: true, buildConfig: config });
  } catch (err) {
    next(err);
  }
}

async function getBuildConfigController(req, res, next) {
  try {
    const { serviceId } = req.params;
    const config = await dockerizeService.getBuildConfigForService(req.user.id, serviceId);
    res.status(200).json({ success: true, buildConfig: config });
  } catch (err) {
    next(err);
  }
}

const dockerizeAiService = require('./dockerize.ai.service');
const githubService = require('../github/github.service');

async function suggestController(req, res, next) {
  try {
    const { service_id, github_token_id } = req.body;
    const service = await dockerizeService.getServiceOwnedByUser(req.user.id, service_id); // reuse existing ownership check
    if (!service) return next(new AppError('Service not found', 404));

    const accessToken = await githubService.getDecryptedToken(req.user.id, github_token_id);
    const { owner, repo } = githubService.parseRepoUrl(service.repository_url);

    const branch = service.branch || 'main';
    const [packageJson, requirementsTxt, pyprojectToml, pipfile, setupPy] = await Promise.all([
      githubService.getFileContent({ accessToken, owner, repo, path: 'package.json', branch }),
      githubService.getFileContent({ accessToken, owner, repo, path: 'requirements.txt', branch }),
      githubService.getFileContent({ accessToken, owner, repo, path: 'pyproject.toml', branch }),
      githubService.getFileContent({ accessToken, owner, repo, path: 'Pipfile', branch }),
      githubService.getFileContent({ accessToken, owner, repo, path: 'setup.py', branch }),
    ]);

    const fileList = [
      packageJson && 'package.json',
      requirementsTxt && 'requirements.txt',
      pyprojectToml && 'pyproject.toml',
      pipfile && 'Pipfile',
      setupPy && 'setup.py',
    ].filter(Boolean);

    const suggestion = await dockerizeAiService.suggestDockerConfig({
      packageJson, requirementsTxt, pyprojectToml, pipfile, setupPy, fileList,
    });

    res.status(200).json({ success: true, suggestion }); // frontend pre-fills the form with this — nothing auto-applies
  } catch (err) {
    next(err);
  }
}

module.exports = {
  markExistingController,
  getLanguageDefaultsController,
  generateController,
  getBuildConfigController,
  suggestController,
};