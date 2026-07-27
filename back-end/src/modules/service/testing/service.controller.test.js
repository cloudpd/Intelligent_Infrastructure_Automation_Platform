// Manually mocked (not auto-mocked) so Jest never has to load the real
// service.service.js -> service.model.js / projects.model.js -> sequelize
// chain just to introspect its shape.
jest.mock('../service.service', () => ({
  createService: jest.fn(),
  getServiceById: jest.fn(),
  getProjectServices: jest.fn(),
  updateService: jest.fn(),
  deleteService: jest.fn(),
  getAllServices: jest.fn(),
}));

const servicesService = require('../service.service');
const {
  createServiceController,
  getServiceController,
  getProjectServicesController,
  updateServiceController,
  deleteServiceController,
  getAllServicesController,
} = require('../service.controller');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('service.controller', () => {
  const next = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createServiceController', () => {
    it('returns 201 with the created service', async () => {
      const req = {
        user: { id: 'user-1' },
        params: { projectId: 'proj-1' },
        body: { name: 'api', repository_url: 'https://github.com/user/api', branch: 'main' },
      };
      const res = buildRes();
      const createdService = { id: 'svc-1', name: 'api' };
      servicesService.createService.mockResolvedValue(createdService);

      await createServiceController(req, res, next);

      expect(servicesService.createService).toHaveBeenCalledWith('user-1', 'proj-1', {
        name: 'api',
        repository_url: 'https://github.com/user/api',
        branch: 'main',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Service created successfully',
        service: createdService,
      });
    });

    it('forwards errors to next() (e.g. project not found / name conflict)', async () => {
      const req = { user: { id: 'user-1' }, params: { projectId: 'proj-1' }, body: { name: 'api' } };
      const res = buildRes();
      const error = new Error('boom');
      servicesService.createService.mockRejectedValue(error);

      await createServiceController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getServiceController', () => {
    it('returns 200 with the requested service', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'svc-1' } };
      const res = buildRes();
      const fakeService = { id: 'svc-1', name: 'api' };
      servicesService.getServiceById.mockResolvedValue(fakeService);

      await getServiceController(req, res, next);

      expect(servicesService.getServiceById).toHaveBeenCalledWith('svc-1', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, service: fakeService });
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'missing' } };
      const res = buildRes();
      const error = new Error('not found');
      servicesService.getServiceById.mockRejectedValue(error);

      await getServiceController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getProjectServicesController', () => {
    it('returns 200 with the list of services and their count', async () => {
      const req = { user: { id: 'user-1' }, params: { projectId: 'proj-1' } };
      const res = buildRes();
      const fakeServices = [{ id: 'svc-1' }, { id: 'svc-2' }];
      servicesService.getProjectServices.mockResolvedValue(fakeServices);

      await getProjectServicesController(req, res, next);

      expect(servicesService.getProjectServices).toHaveBeenCalledWith('proj-1', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        services: fakeServices,
      });
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' }, params: { projectId: 'missing' } };
      const res = buildRes();
      const error = new Error('boom');
      servicesService.getProjectServices.mockRejectedValue(error);

      await getProjectServicesController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateServiceController', () => {
    it('returns 200 with the updated service', async () => {
      const req = {
        user: { id: 'user-1' },
        params: { id: 'svc-1' },
        body: { name: 'new-name', repository_url: 'https://github.com/user/new', branch: 'dev' },
      };
      const res = buildRes();
      const updatedService = { id: 'svc-1', name: 'new-name' };
      servicesService.updateService.mockResolvedValue(updatedService);

      await updateServiceController(req, res, next);

      expect(servicesService.updateService).toHaveBeenCalledWith('svc-1', 'user-1', {
        name: 'new-name',
        repository_url: 'https://github.com/user/new',
        branch: 'dev',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Service updated successfully',
        service: updatedService,
      });
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'svc-1' }, body: { name: 'x' } };
      const res = buildRes();
      const error = new Error('boom');
      servicesService.updateService.mockRejectedValue(error);

      await updateServiceController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteServiceController', () => {
    it('returns 200 with a success message', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'svc-1' } };
      const res = buildRes();
      servicesService.deleteService.mockResolvedValue(undefined);

      await deleteServiceController(req, res, next);

      expect(servicesService.deleteService).toHaveBeenCalledWith('svc-1', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Service deleted successfully',
      });
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'svc-1' } };
      const res = buildRes();
      const error = new Error('boom');
      servicesService.deleteService.mockRejectedValue(error);

      await deleteServiceController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllServicesController', () => {
    it('returns 200 with all services for the user and their count', async () => {
      const req = { user: { id: 'user-1' } };
      const res = buildRes();
      const fakeServices = [{ id: 'svc-1' }, { id: 'svc-2' }, { id: 'svc-3' }];
      servicesService.getAllServices.mockResolvedValue(fakeServices);

      await getAllServicesController(req, res, next);

      expect(servicesService.getAllServices).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 3,
        services: fakeServices,
      });
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' } };
      const res = buildRes();
      const error = new Error('boom');
      servicesService.getAllServices.mockRejectedValue(error);

      await getAllServicesController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
