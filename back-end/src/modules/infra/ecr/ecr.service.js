const AppError = require('../../../core/utils/AppError');
const { Service } = require('../../service/service.model');
const { Project } = require('../../projects/projects.model');
const { Ecr } = require('./ecr.model');

/** Verify the service exists and is owned by this user. */
async function getOwnedService(serviceId, userId) {
  const service = await Service.findOne({
    where: { id: serviceId },
    include: [{ model: Project, as: 'project', where: { owner_id: userId }, attributes: [] }],
  });
  if (!service) throw new AppError('Service not found', 404);
  return service;
}

/** Verify the ECR repo exists and is owned by this user (via service → project chain). */
async function getOwnedRepo(repoId, userId) {
  const repo = await Ecr.findOne({
    where: { id: repoId },
    include: [
      {
        model: Service,
        as: 'service',
        required: true,
        attributes: [],
        include: [{ model: Project, as: 'project', where: { owner_id: userId }, attributes: [] }],
      },
    ],
  });
  if (!repo) throw new AppError('ECR repository not found', 404);
  return repo;
}

async function createRepo(userId, serviceId, data) {
  await getOwnedService(serviceId, userId);
  return Ecr.create({
    service_id: serviceId,
    name: data.name,
    image_tag_mutability: data.image_tag_mutability ?? 'MUTABLE',
    scan_on_push: data.scan_on_push ?? true,
    force_delete: data.force_delete ?? false,
  });
}

async function listRepos(userId, serviceId) {
  await getOwnedService(serviceId, userId);
  return Ecr.findAll({ where: { service_id: serviceId } });
}

async function getRepo(userId, repoId) {
  return getOwnedRepo(repoId, userId);
}

async function updateRepo(userId, repoId, data) {
  const repo = await getOwnedRepo(repoId, userId);
  if (repo.status === 'applied') {
    throw new AppError(
      'This ECR repository has already been applied to real infrastructure. Destroy it via Terraform before editing.',
      422
    );
  }
  return repo.update(data);
}

async function deleteRepo(userId, repoId) {
  const repo = await getOwnedRepo(repoId, userId);
  if (repo.status === 'applied') {
    throw new AppError(
      'Cannot delete an ECR repository with applied infrastructure. Destroy it via Terraform first.',
      422
    );
  }
  await repo.destroy();
}

/**
 * Transforms a DB Ecr record into the flat config object
 * the Terraform generator expects. Keeps the generator
 * decoupled from Sequelize model internals.
 */
function toGeneratorConfig(repo, { serviceSlug, environment }) {
  return {
    name: repo.name,
    image_tag_mutability: repo.image_tag_mutability,
    scan_on_push: repo.scan_on_push,
    force_delete: repo.force_delete,
    serviceSlug,
    environment,
  };
}

async function getGeneratorConfig(userId, repoId, { serviceSlug, environment }) {
  const repo = await getOwnedRepo(repoId, userId);
  return toGeneratorConfig(repo, { serviceSlug, environment });
}

module.exports = {
  createRepo,
  listRepos,
  getRepo,
  updateRepo,
  deleteRepo,
  getGeneratorConfig,
};
