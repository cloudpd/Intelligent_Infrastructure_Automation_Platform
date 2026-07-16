const servicesService = require('./service.service');

async function createServiceController(req, res, next) {
  try {
    const { projectId } = req.params;
    const { name, repository_url, branch } = req.body;
    const service = await servicesService.createService(req.user.id, projectId, {
      name,
      repository_url,
      branch,
    });
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service,
    });
  } catch (err) {
    next(err);
  }
}

async function getServiceController(req, res, next) {
  try {
    const { id } = req.params;
    const service = await servicesService.getServiceById(id, req.user.id);
    res.status(200).json({
      success: true,
      service,
    });
  } catch (err) {
    next(err);
  }
}

async function getProjectServicesController(req, res, next) {
  try {
    const { projectId } = req.params;
    const services = await servicesService.getProjectServices(projectId, req.user.id);
    res.status(200).json({
      success: true,
      count: services.length,
      services,
    });
  } catch (err) {
    next(err);
  }
}

async function updateServiceController(req, res, next) {
  try {
    const { id } = req.params;
    const { name, repository_url, branch } = req.body;
    const service = await servicesService.updateService(id, req.user.id, {
      name,
      repository_url,
      branch,
    });
    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      service,
    });
  } catch (err) {
    next(err);
  }
}

async function getAllServicesController(req, res, next) {
  try {
    const services = await servicesService.getAllServices(req.user.id);
    res.status(200).json({
      success: true,
      count: services.length,
      services,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteServiceController(req, res, next) {
  try {
    const { id } = req.params;
    await servicesService.deleteService(id, req.user.id);
    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createServiceController,
  getServiceController,
  getProjectServicesController,
  updateServiceController,
  deleteServiceController,
  getAllServicesController
};