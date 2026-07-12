const fs = require("fs");
const path = require("path");
const AppError = require('../../core/utils/AppError');

const { GithubToken } = require('../../modules/github/github.model');
const { Service } = require('../../modules/service/service.model');
const { Project } = require('../../modules/projects/projects.model');

const { decrypt } = require('../../core/utils/encryption');

const FILE_PATH_IN_REPO = ".github/workflows/ci.yaml";
const LOCAL_FILE_PATH = path.join(__dirname, "templates/ci.yaml");
const githubApiBaseUrl = "https://api.github.com/repos";


function parseGithubUrl(repositoryUrl) {
  const cleanUrl = repositoryUrl.replace(/\.git$/, "");
  const parts = cleanUrl.split("/");
  const repo = parts.pop();
  const owner = parts.pop();
  return { owner, repo };
}

async function getServiceById(serviceId, userId) {
  const service = await Service.findByPk(serviceId, {
    include: [{ model: Project, as: 'project', attributes: ['id', 'owner_id'] }],
  });

  if (!service) throw new AppError('Service not found', 404);
  if (service.project.owner_id !== userId) {
    throw new AppError('You do not have permission to access this service', 403);
  }
  return service;
}

async function getPATTokenFromDB(userId) {
  const tokenRecord = await GithubToken.findOne({ where: { user_id: userId } });
  if (!tokenRecord) throw new AppError("Token not found", 404);
  return decrypt(tokenRecord.token);
}

async function getFileSha(token, owner, repo, branch) {
  const res = await fetch(
    `${githubApiBaseUrl}/${owner}/${repo}/contents/${FILE_PATH_IN_REPO}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (res.status === 404) return null;
  if (!res.ok) throw new AppError(`Failed to get file: ${res.status}`, res.status);

  const data = await res.json();
  return data.sha;
}

async function pushFile(userId, serviceId) {
  const content = fs.readFileSync(LOCAL_FILE_PATH, "utf-8");
  const contentBase64 = Buffer.from(content).toString("base64");

  const { branch, repository_url } = await getServiceById(serviceId, userId);
  const { owner, repo } = parseGithubUrl(repository_url);
  const token = await getPATTokenFromDB(userId);

  const sha = await getFileSha(token, owner, repo, branch);

  const body = {
    message: "Add/Update ci.yaml via API",
    content: contentBase64,
    branch,
    ...(sha && { sha }),
  };

  const res = await fetch(
    `${githubApiBaseUrl}/repos/${owner}/${repo}/contents/${FILE_PATH_IN_REPO}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const result = await res.json();
  if (!res.ok) {
    throw new AppError(`Push failed: ${res.status} - ${JSON.stringify(result)}`, res.status);
  }

  return result;
}

module.exports = { pushFile };