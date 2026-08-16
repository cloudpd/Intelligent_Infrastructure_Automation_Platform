jest.mock(
  '../service.model',
  () => ({
    Service: {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
    },
  }),
  { virtual: true }
);

// Reuse the real projects.model module *path* but replace its content --
// service.service.js only needs `Project.findByPk` as a reference/lookup.
jest.mock('../../projects/projects.model', () => ({
  Project: {
    findByPk: jest.fn(),
  },
}));

jest.mock(
  '../../../core/utils/AppError',
  () => require('../../../core/test-utils/mocks.AppError'),
  { virtual: true }
);

const { Service } = require('../service.model');
const { Project } = require('../../projects/projects.model');
const servicesService = require('../service.service');

describe('service.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createService', () => {
    it('creates a service when the user owns the project and no name conflict exists', async () => {
      Project.findByPk.mockResolvedValue({ id: 'proj-1', owner_id: 'user-1' });
      Service.findOne.mockResolvedValue(null);
      const createdService = { id: 'svc-1', name: 'api' };
      Service.create.mockResolvedValue(createdService);

      const result = await servicesService.createService('user-1', 'proj-1', {
        name: 'api',
        repository_url: 'https://github.com/user/api',
        branch: 'main',
      });

      expect(Project.findByPk).toHaveBeenCalledWith('proj-1');
      expect(Service.findOne).toHaveBeenCalledWith({
        where: { project_id: 'proj-1', name: 'api' },
      });
      expect(Service.create).toHaveBeenCalledWith({
        project_id: 'proj-1',
        name: 'api',
        repository_url: 'https://github.com/user/api',
        branch: 'main',
      });
      expect(result).toBe(createdService);
    });

    it('throws a 404 AppError when the project does not exist', async () => {
      Project.findByPk.mockResolvedValue(null);

      await expect(
        servicesService.createService('user-1', 'missing-proj', { name: 'api' })
      ).rejects.toMatchObject({ message: 'Project not found', statusCode: 404 });

      expect(Service.findOne).not.toHaveBeenCalled();
      expect(Service.create).not.toHaveBeenCalled();
    });

    it('throws a 403 AppError when the project belongs to a different user', async () => {
      Project.findByPk.mockResolvedValue({ id: 'proj-1', owner_id: 'someone-else' });

      await expect(
        servicesService.createService('user-1', 'proj-1', { name: 'api' })
      ).rejects.toMatchObject({
        message: 'You do not have permission to access this project',
        statusCode: 403,
      });

      expect(Service.create).not.toHaveBeenCalled();
    });

    it('throws a 409 AppError when a service with the same name already exists in the project', async () => {
      Project.findByPk.mockResolvedValue({ id: 'proj-1', owner_id: 'user-1' });
      Service.findOne.mockResolvedValue({ id: 'existing-svc' });

      await expect(
        servicesService.createService('user-1', 'proj-1', { name: 'api' })
      ).rejects.toMatchObject({
        message: 'A service with this name already exists in this project',
        statusCode: 409,
      });

      expect(Service.create).not.toHaveBeenCalled();
    });
  });

  describe('getServiceById', () => {
    it('returns the service when it exists and the user owns the parent project', async () => {
      const fakeService = { id: 'svc-1', project: { owner_id: 'user-1' } };
      Service.findByPk.mockResolvedValue(fakeService);

      const result = await servicesService.getServiceById('svc-1', 'user-1');

      expect(Service.findByPk).toHaveBeenCalledWith(
        'svc-1',
        expect.objectContaining({ include: expect.any(Array) })
      );
      expect(result).toBe(fakeService);
    });

    it('throws a 404 AppError when the service does not exist', async () => {
      Service.findByPk.mockResolvedValue(null);

      await expect(servicesService.getServiceById('missing', 'user-1')).rejects.toMatchObject({
        message: 'Service not found',
        statusCode: 404,
      });
    });

    it('throws a 403 AppError when the parent project belongs to a different user', async () => {
      Service.findByPk.mockResolvedValue({ id: 'svc-1', project: { owner_id: 'someone-else' } });

      await expect(servicesService.getServiceById('svc-1', 'user-1')).rejects.toMatchObject({
        message: 'You do not have permission to access this service',
        statusCode: 403,
      });
    });
  });

  describe('getProjectServices', () => {
    it('returns all services for a project the user owns', async () => {
      Project.findByPk.mockResolvedValue({ id: 'proj-1', owner_id: 'user-1' });
      const fakeServices = [{ id: 'svc-1' }, { id: 'svc-2' }];
      Service.findAll.mockResolvedValue(fakeServices);

      const result = await servicesService.getProjectServices('proj-1', 'user-1');

      expect(Service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { project_id: 'proj-1' } })
      );
      expect(result).toBe(fakeServices);
    });

    it('throws a 404 AppError when the project does not exist', async () => {
      Project.findByPk.mockResolvedValue(null);

      await expect(
        servicesService.getProjectServices('missing-proj', 'user-1')
      ).rejects.toMatchObject({ message: 'Project not found', statusCode: 404 });
    });

    it('throws a 403 AppError when the project belongs to a different user', async () => {
      Project.findByPk.mockResolvedValue({ id: 'proj-1', owner_id: 'someone-else' });

      await expect(
        servicesService.getProjectServices('proj-1', 'user-1')
      ).rejects.toMatchObject({
        message: 'You do not have permission to access this project',
        statusCode: 403,
      });
    });
  });

  describe('updateService', () => {
    function buildService(overrides = {}) {
      return {
        id: 'svc-1',
        project_id: 'proj-1',
        name: 'old-name',
        repository_url: 'https://github.com/user/old',
        branch: 'main',
        project: { owner_id: 'user-1' },
        save: jest.fn().mockResolvedValue(true),
        ...overrides,
      };
    }

    it('updates name, repository_url and branch when there is no name conflict', async () => {
      const service = buildService();
      Service.findByPk.mockResolvedValue(service);
      Service.findOne.mockResolvedValue(null);

      const result = await servicesService.updateService('svc-1', 'user-1', {
        name: 'new-name',
        repository_url: 'https://github.com/user/new',
        branch: 'develop',
      });

      expect(service.name).toBe('new-name');
      expect(service.repository_url).toBe('https://github.com/user/new');
      expect(service.branch).toBe('develop');
      expect(service.save).toHaveBeenCalled();
      expect(result).toBe(service);
    });

    it('does not check for conflicts when the name is unchanged', async () => {
      const service = buildService({ name: 'same-name' });
      Service.findByPk.mockResolvedValue(service);

      await servicesService.updateService('svc-1', 'user-1', { name: 'same-name' });

      expect(Service.findOne).not.toHaveBeenCalled();
      expect(service.save).toHaveBeenCalled();
    });

    it('throws a 404 AppError when the service does not exist', async () => {
      Service.findByPk.mockResolvedValue(null);

      await expect(
        servicesService.updateService('missing', 'user-1', { name: 'x' })
      ).rejects.toMatchObject({ message: 'Service not found', statusCode: 404 });
    });

    it('throws a 403 AppError when the parent project belongs to a different user', async () => {
      const service = buildService({ project: { owner_id: 'someone-else' } });
      Service.findByPk.mockResolvedValue(service);

      await expect(
        servicesService.updateService('svc-1', 'user-1', { name: 'x' })
      ).rejects.toMatchObject({
        message: 'You do not have permission to update this service',
        statusCode: 403,
      });
      expect(service.save).not.toHaveBeenCalled();
    });

    it('throws a 409 AppError when renaming to a name already used in the same project', async () => {
      const service = buildService();
      Service.findByPk.mockResolvedValue(service);
      Service.findOne.mockResolvedValue({ id: 'other-svc', name: 'taken-name' });

      await expect(
        servicesService.updateService('svc-1', 'user-1', { name: 'taken-name' })
      ).rejects.toMatchObject({
        message: 'A service with this name already exists in this project',
        statusCode: 409,
      });
      expect(service.save).not.toHaveBeenCalled();
    });

    it('updates only repository_url when that is the only field provided', async () => {
      const service = buildService();
      Service.findByPk.mockResolvedValue(service);

      await servicesService.updateService('svc-1', 'user-1', {
        repository_url: 'https://github.com/user/only-url-change',
      });

      expect(service.name).toBe('old-name');
      expect(service.repository_url).toBe('https://github.com/user/only-url-change');
      expect(service.save).toHaveBeenCalled();
    });
  });

  describe('deleteService', () => {
    it('deletes the service when it exists and the user owns the parent project', async () => {
      const service = {
        id: 'svc-1',
        project: { owner_id: 'user-1' },
        destroy: jest.fn().mockResolvedValue(true),
      };
      Service.findByPk.mockResolvedValue(service);

      await servicesService.deleteService('svc-1', 'user-1');

      expect(service.destroy).toHaveBeenCalled();
    });

    it('throws a 404 AppError when the service does not exist', async () => {
      Service.findByPk.mockResolvedValue(null);

      await expect(servicesService.deleteService('missing', 'user-1')).rejects.toMatchObject({
        message: 'Service not found',
        statusCode: 404,
      });
    });

    it('throws a 403 AppError when the parent project belongs to a different user', async () => {
      const service = {
        id: 'svc-1',
        project: { owner_id: 'someone-else' },
        destroy: jest.fn(),
      };
      Service.findByPk.mockResolvedValue(service);

      await expect(servicesService.deleteService('svc-1', 'user-1')).rejects.toMatchObject({
        message: 'You do not have permission to delete this service',
        statusCode: 403,
      });
      expect(service.destroy).not.toHaveBeenCalled();
    });
  });

  describe('getAllServices', () => {
    it("returns all services belonging to the user's projects", async () => {
      const fakeServices = [{ id: 'svc-1' }, { id: 'svc-2' }];
      Service.findAll.mockResolvedValue(fakeServices);

      const result = await servicesService.getAllServices('user-1');

      expect(Service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: [
            expect.objectContaining({
              as: 'project',
              where: { owner_id: 'user-1' },
            }),
          ],
        })
      );
      expect(result).toBe(fakeServices);
    });

    it('returns an empty array when the user has no services', async () => {
      Service.findAll.mockResolvedValue([]);

      const result = await servicesService.getAllServices('user-1');

      expect(result).toEqual([]);
    });
  });
});
