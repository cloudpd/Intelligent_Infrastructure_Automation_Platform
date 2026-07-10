const { Service } = require('./service.model');
const { Project } = require('../projects/projects.model');
const AppError = require('../../core/utils/AppError');

async function verifyProjectOwnership(projectId, userId) {
  const project = await Project.findByPk(projectId);
  if (!project) {
    throw new AppError('Project not found', 404);
  }
  if (project.owner_id !== userId) {
    throw new AppError('You do not have permission to access this project', 403);
  }
  return project;
}

async function createService(userId, projectId, serviceData) {
  await verifyProjectOwnership(projectId, userId);

  const existingService = await Service.findOne({
    where: { project_id: projectId, name: serviceData.name },
  });
  if (existingService) {
    throw new AppError('A service with this name already exists in this project', 409);
  }

  const service = await Service.create({
    project_id: projectId,
    name: serviceData.name,
    repository_url: serviceData.repository_url,
    branch: serviceData.branch,
  });
  return service;
}

async function getServiceById(serviceId, userId) {
  const service = await Service.findByPk(serviceId, {
    include: [{ model: Project, as: 'project' }],
  });
  if (!service) {
    throw new AppError('Service not found', 404);
  }
  if (service.project.owner_id !== userId) {
    throw new AppError('You do not have permission to access this service', 403);
  }
  return service;
}

async function getProjectServices(projectId, userId) {
  await verifyProjectOwnership(projectId, userId);

  const services = await Service.findAll({
    where: { project_id: projectId },
    order: [['createdAt', 'DESC']],
  });
  return services;
}

async function updateService(serviceId, userId, updateData) {
  const service = await Service.findByPk(serviceId, {
    include: [{ model: Project, as: 'project' }],
  });
  if (!service) {
    throw new AppError('Service not found', 404);
  }
  if (service.project.owner_id !== userId) {
    throw new AppError('You do not have permission to update this service', 403);
  }

  if (updateData.name && updateData.name !== service.name) {
    const conflict = await Service.findOne({
      where: {
        project_id: service.project_id,
        name: updateData.name,
      },
    });
    if (conflict) {
      throw new AppError('A service with this name already exists in this project', 409);
    }
    service.name = updateData.name;
  }
  if (updateData.repository_url !== undefined) service.repository_url = updateData.repository_url;
  if (updateData.branch !== undefined) service.branch = updateData.branch;

  await service.save();
  return service;
}

async function deleteService(serviceId, userId) {
  const service = await Service.findByPk(serviceId, {
    include: [{ model: Project, as: 'project' }],
  });
  if (!service) {
    throw new AppError('Service not found', 404);
  }
  if (service.project.owner_id !== userId) {
    throw new AppError('You do not have permission to delete this service', 403);
  }
  await service.destroy();
}

module.exports = {
  createService,
  getServiceById,
  getProjectServices,
  updateService,
  deleteService,
};