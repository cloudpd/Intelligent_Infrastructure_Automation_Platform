const express = require('express');
const {
  createProjectController,
  getProjectController,
  getUserProjectsController,
  updateProjectController,
  deleteProjectController,
} = require('./projects.controller');
const authenticate = require('../../core/middlewares/authenticate');
const validate = require('../../core/middlewares/validate');
const { createProjectSchema, updateProjectSchema } = require('./projects.validation');

const router = express.Router();


router.use(authenticate);


router.get('/', getUserProjectsController);
router.post('/create', validate(createProjectSchema), createProjectController);
router.get('/list', getUserProjectsController);
router.get('/get/:id', getProjectController);
router.put('/update/:id', validate(updateProjectSchema), updateProjectController);
router.delete('/delete/:id', deleteProjectController);

module.exports = router;
