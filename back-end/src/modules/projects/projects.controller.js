const projectsService = require('./projects.service');


async function getUserProjectsController(req, res, next) {
  try {
    const projects = await projectsService.getUserProjects(req.user.id);

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (err) {
    next(err);
  }
}

async function createProjectController(req, res, next) {
  try {
    const { name, description } = req.body;
    const project = await projectsService.createProject(req.user.id, {
      name,
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project,
    });
  } catch (err) {
    next(err);
  }
}


async function getProjectController(req, res, next) {
  try {
    const { id } = req.params;
    const project = await projectsService.getProjectById(id, req.user.id);

    res.status(200).json({
      success: true,
      project,
    });
  } catch (err) {
    next(err);
  }
}


async function getUserProjectsController(req, res, next) {
  try {
    const projects = await projectsService.getUserProjects(req.user.id);

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (err) {
    next(err);
  }
}


async function updateProjectController(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const project = await projectsService.updateProject(id, req.user.id, {
      name,
      description,
    });

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project,
    });
  } catch (err) {
    next(err);
  }
}


async function deleteProjectController(req, res, next) {
  try {
    const { id } = req.params;

    await projectsService.deleteProject(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProjectController,
  getProjectController,
  getUserProjectsController,
  updateProjectController,
  deleteProjectController,
};
