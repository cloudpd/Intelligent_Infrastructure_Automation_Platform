const { Project } = require('./projects.model');
const { User } = require('../auth/auth.model');
const AppError = require('../../core/utils/AppError');


async function getUserProjects(userId) {
  const projects = await Project.findAll({
    where: { owner_id: userId },
    include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'DESC']],
  });

  return projects;
}

async function createProject(userId, projectData) {
  const existingProject = await Project.findOne({
    where: { owner_id: userId, name: projectData.name },
  });
  if (existingProject) {
    throw new AppError('A project with this name already exists for this user', 409);
  }

  const project = await Project.create({
    owner_id: userId,
    name: projectData.name,
    description: projectData.description,
  });

  return project;
}


async function getProjectById(projectId, userId) {
  const project = await Project.findByPk(projectId, {
    include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

 
  if (project.owner_id !== userId) {
    throw new AppError('You do not have permission to access this project', 403);
  }

  return project;
}


async function getUserProjects(userId) {
  const projects = await Project.findAll({
    where: { owner_id: userId },
    include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'DESC']],
  });

  return projects;
}


async function updateProject(projectId, userId, updateData) {
  const project = await Project.findByPk(projectId);

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  
  if (project.owner_id !== userId) {
    throw new AppError('You do not have permission to update this project', 403);
  }

  
  if (updateData.name && updateData.name !== project.name) {
    const conflict = await Project.findOne({
      where: {
        owner_id: userId,
        name: updateData.name,
      },
    });
    if (conflict) {
      throw new AppError('A project with this name already exists for this user', 409);
    }
    project.name = updateData.name;
  }

  if (updateData.description !== undefined) project.description = updateData.description;

  await project.save();

  return project;
}


async function deleteProject(projectId, userId) {
  const project = await Project.findByPk(projectId);

  if (!project) {
    throw new AppError('Project not found', 404);
  }


  if (project.owner_id !== userId) {
    throw new AppError('You do not have permission to delete this project', 403);
  }

  await project.destroy();
}

module.exports = {
  createProject,
  getProjectById,
  getUserProjects,
  updateProject,
  deleteProject,
};
