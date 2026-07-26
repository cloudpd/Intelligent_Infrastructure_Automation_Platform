// Manually mocked (not auto-mocked) so Jest never has to load the real
// projects.service.js -> projects.model.js -> sequelize chain just to
// introspect its shape.
jest.mock('../projects.service', () => ({
  getUserProjects: jest.fn(),
  createProject: jest.fn(),
  getProjectById: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
}));

const projectsService = require('../projects.service');
const {
  createProjectController,
  getProjectController,
  getUserProjectsController,
  updateProjectController,
  deleteProjectController,
} = require('../projects.controller');

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('projects.controller', () => {
  const next = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProjectsController', () => {
    it('returns 200 with the list of projects and their count', async () => {
      const req = { user: { id: 'user-1' } };
      const res = buildRes();
      const fakeProjects = [{ id: 'p1' }, { id: 'p2' }];
      projectsService.getUserProjects.mockResolvedValue(fakeProjects);

      await getUserProjectsController(req, res, next);

      expect(projectsService.getUserProjects).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        projects: fakeProjects,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' } };
      const res = buildRes();
      const error = new Error('DB down');
      projectsService.getUserProjects.mockRejectedValue(error);

      await getUserProjectsController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('createProjectController', () => {
    it('returns 201 with the created project', async () => {
      const req = { user: { id: 'user-1' }, body: { name: 'GP', description: 'desc' } };
      const res = buildRes();
      const createdProject = { id: 'p1', name: 'GP', description: 'desc' };
      projectsService.createProject.mockResolvedValue(createdProject);

      await createProjectController(req, res, next);

      expect(projectsService.createProject).toHaveBeenCalledWith('user-1', {
        name: 'GP',
        description: 'desc',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Project created successfully',
        project: createdProject,
      });
    });

    it('forwards errors to next() (e.g. duplicate name conflict)', async () => {
      const req = { user: { id: 'user-1' }, body: { name: 'GP' } };
      const res = buildRes();
      const error = new Error('Conflict');
      projectsService.createProject.mockRejectedValue(error);

      await createProjectController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getProjectController', () => {
    it('returns 200 with the requested project', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'p1' } };
      const res = buildRes();
      const fakeProject = { id: 'p1', name: 'GP' };
      projectsService.getProjectById.mockResolvedValue(fakeProject);

      await getProjectController(req, res, next);

      expect(projectsService.getProjectById).toHaveBeenCalledWith('p1', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, project: fakeProject });
    });

    it('forwards errors to next() (e.g. not found / forbidden)', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'missing' } };
      const res = buildRes();
      const error = new Error('Not found');
      projectsService.getProjectById.mockRejectedValue(error);

      await getProjectController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateProjectController', () => {
    it('returns 200 with the updated project', async () => {
      const req = {
        user: { id: 'user-1' },
        params: { id: 'p1' },
        body: { name: 'New name', description: 'New desc' },
      };
      const res = buildRes();
      const updatedProject = { id: 'p1', name: 'New name', description: 'New desc' };
      projectsService.updateProject.mockResolvedValue(updatedProject);

      await updateProjectController(req, res, next);

      expect(projectsService.updateProject).toHaveBeenCalledWith('p1', 'user-1', {
        name: 'New name',
        description: 'New desc',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Project updated successfully',
        project: updatedProject,
      });
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'p1' }, body: { name: 'X' } };
      const res = buildRes();
      const error = new Error('Update failed');
      projectsService.updateProject.mockRejectedValue(error);

      await updateProjectController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteProjectController', () => {
    it('returns 200 with a success message', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'p1' } };
      const res = buildRes();
      projectsService.deleteProject.mockResolvedValue(undefined);

      await deleteProjectController(req, res, next);

      expect(projectsService.deleteProject).toHaveBeenCalledWith('p1', 'user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Project deleted successfully',
      });
    });

    it('forwards errors to next()', async () => {
      const req = { user: { id: 'user-1' }, params: { id: 'p1' } };
      const res = buildRes();
      const error = new Error('Delete failed');
      projectsService.deleteProject.mockRejectedValue(error);

      await deleteProjectController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});