// NOTE: jest.mock calls are placed BEFORE any require() of the real modules
// below. This project's jest config does not run files through babel (see
// jest.config.js), so jest.mock calls are NOT auto-hoisted the way they would
// be with babel-jest -- ordering matters here.

jest.mock('../projects.model', () => ({
  Project: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

// auth.model is required by projects.service (for the `User` include reference).
// We stub it out since the service only needs the reference, not real behavior.
jest.mock('../../auth/auth.model', () => ({ User: {} }), { virtual: true });

// AppError is a small custom error class (message, statusCode). We mock it with
// a lightweight implementation so property checks work in assertions.
jest.mock(
  '../../../core/utils/AppError',
  () =>
    class AppError extends Error {
      constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
      }
    },
  { virtual: true }
);

const { Project } = require('../projects.model');
const projectsService = require('../projects.service');

describe('projects.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProjects', () => {
    it('returns all projects belonging to the given user', async () => {
      const fakeProjects = [{ id: 'p1' }, { id: 'p2' }];
      Project.findAll.mockResolvedValue(fakeProjects);

      const result = await projectsService.getUserProjects('user-1');

      expect(Project.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { owner_id: 'user-1' },
          order: [['createdAt', 'DESC']],
        })
      );
      expect(result).toBe(fakeProjects);
    });

    it('returns an empty array when the user has no projects', async () => {
      Project.findAll.mockResolvedValue([]);

      const result = await projectsService.getUserProjects('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('createProject', () => {
    it('creates a project when no name conflict exists', async () => {
      Project.findOne.mockResolvedValue(null);
      const createdProject = { id: 'p1', name: 'GP', description: 'desc' };
      Project.create.mockResolvedValue(createdProject);

      const result = await projectsService.createProject('user-1', {
        name: 'GP',
        description: 'desc',
      });

      expect(Project.findOne).toHaveBeenCalledWith({
        where: { owner_id: 'user-1', name: 'GP' },
      });
      expect(Project.create).toHaveBeenCalledWith({
        owner_id: 'user-1',
        name: 'GP',
        description: 'desc',
      });
      expect(result).toBe(createdProject);
    });

    it('throws a 409 AppError when a project with the same name already exists for the user', async () => {
      Project.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        projectsService.createProject('user-1', { name: 'GP', description: 'desc' })
      ).rejects.toMatchObject({
        message: 'A project with this name already exists for this user',
        statusCode: 409,
      });

      expect(Project.create).not.toHaveBeenCalled();
    });
  });

  describe('getProjectById', () => {
    it('returns the project when it exists and belongs to the user', async () => {
      const fakeProject = { id: 'p1', owner_id: 'user-1' };
      Project.findByPk.mockResolvedValue(fakeProject);

      const result = await projectsService.getProjectById('p1', 'user-1');

      expect(Project.findByPk).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ include: expect.any(Array) })
      );
      expect(result).toBe(fakeProject);
    });

    it('throws a 404 AppError when the project does not exist', async () => {
      Project.findByPk.mockResolvedValue(null);

      await expect(projectsService.getProjectById('missing', 'user-1')).rejects.toMatchObject({
        message: 'Project not found',
        statusCode: 404,
      });
    });

    it('throws a 403 AppError when the project belongs to a different user', async () => {
      Project.findByPk.mockResolvedValue({ id: 'p1', owner_id: 'someone-else' });

      await expect(projectsService.getProjectById('p1', 'user-1')).rejects.toMatchObject({
        message: 'You do not have permission to access this project',
        statusCode: 403,
      });
    });
  });

  describe('updateProject', () => {
    it('updates the name and description when there is no conflict', async () => {
      const project = {
        id: 'p1',
        owner_id: 'user-1',
        name: 'Old name',
        description: 'Old desc',
        save: jest.fn().mockResolvedValue(true),
      };
      Project.findByPk.mockResolvedValue(project);
      Project.findOne.mockResolvedValue(null);

      const result = await projectsService.updateProject('p1', 'user-1', {
        name: 'New name',
        description: 'New desc',
      });

      expect(project.name).toBe('New name');
      expect(project.description).toBe('New desc');
      expect(project.save).toHaveBeenCalled();
      expect(result).toBe(project);
    });

    it('does not touch the name when the new name is the same as the current one', async () => {
      const project = {
        id: 'p1',
        owner_id: 'user-1',
        name: 'Same name',
        description: 'Old desc',
        save: jest.fn().mockResolvedValue(true),
      };
      Project.findByPk.mockResolvedValue(project);

      await projectsService.updateProject('p1', 'user-1', { name: 'Same name' });

      expect(Project.findOne).not.toHaveBeenCalled();
      expect(project.save).toHaveBeenCalled();
    });

    it('throws a 404 AppError when the project does not exist', async () => {
      Project.findByPk.mockResolvedValue(null);

      await expect(
        projectsService.updateProject('missing', 'user-1', { name: 'X' })
      ).rejects.toMatchObject({ message: 'Project not found', statusCode: 404 });
    });

    it('throws a 403 AppError when the project belongs to a different user', async () => {
      Project.findByPk.mockResolvedValue({ id: 'p1', owner_id: 'someone-else' });

      await expect(
        projectsService.updateProject('p1', 'user-1', { name: 'X' })
      ).rejects.toMatchObject({
        message: 'You do not have permission to update this project',
        statusCode: 403,
      });
    });

    it('throws a 409 AppError when renaming to a name that already exists for the user', async () => {
      const project = {
        id: 'p1',
        owner_id: 'user-1',
        name: 'Old name',
        save: jest.fn(),
      };
      Project.findByPk.mockResolvedValue(project);
      Project.findOne.mockResolvedValue({ id: 'p2', name: 'Taken name' });

      await expect(
        projectsService.updateProject('p1', 'user-1', { name: 'Taken name' })
      ).rejects.toMatchObject({
        message: 'A project with this name already exists for this user',
        statusCode: 409,
      });
      expect(project.save).not.toHaveBeenCalled();
    });

    it('updates only the description when description is provided without a name change', async () => {
      const project = {
        id: 'p1',
        owner_id: 'user-1',
        name: 'Keep me',
        description: 'Old desc',
        save: jest.fn().mockResolvedValue(true),
      };
      Project.findByPk.mockResolvedValue(project);

      await projectsService.updateProject('p1', 'user-1', { description: 'New desc' });

      expect(project.name).toBe('Keep me');
      expect(project.description).toBe('New desc');
      expect(project.save).toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('deletes the project when it exists and belongs to the user', async () => {
      const project = { id: 'p1', owner_id: 'user-1', destroy: jest.fn().mockResolvedValue(true) };
      Project.findByPk.mockResolvedValue(project);

      await projectsService.deleteProject('p1', 'user-1');

      expect(project.destroy).toHaveBeenCalled();
    });

    it('throws a 404 AppError when the project does not exist', async () => {
      Project.findByPk.mockResolvedValue(null);

      await expect(projectsService.deleteProject('missing', 'user-1')).rejects.toMatchObject({
        message: 'Project not found',
        statusCode: 404,
      });
    });

    it('throws a 403 AppError when the project belongs to a different user', async () => {
      const project = { id: 'p1', owner_id: 'someone-else', destroy: jest.fn() };
      Project.findByPk.mockResolvedValue(project);

      await expect(projectsService.deleteProject('p1', 'user-1')).rejects.toMatchObject({
        message: 'You do not have permission to delete this project',
        statusCode: 403,
      });
      expect(project.destroy).not.toHaveBeenCalled();
    });
  });
});