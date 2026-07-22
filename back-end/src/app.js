const express = require('express');
const authRoutes = require('./modules/auth/auth.routes');
const projectsRoutes = require('./modules/projects/projects.routes');
const servicesRoutes = require('./modules/service/service.routes');
const errorHandler = require('./core/middlewares/errorHandler');
const githubRoutes = require('./modules/github/github.routes');
const dockerizeRoutes = require('./modules/dockerize/dockerize.routes');
const ciRoutes = require('./modules/ci/ci.routes');
const k8sRoutes = require('./modules/k8s/normal/k8s.routes');
const infraNetworkRoutes = require('./modules/infra/network/network.routes');
const awsRoutes = require('./modules/aws/aws.routes');

const cors = require("cors") ;
const app = express();

app.use(cors({
  origin: '*'
}));
app.use(express.json());

app.use('/services', ciRoutes);

app.use('/services', k8sRoutes);

app.use('/auth', authRoutes);
app.use('/projects', projectsRoutes);
app.use('/services', servicesRoutes);
app.use('/github', githubRoutes);
app.use('/dockerize', dockerizeRoutes);
app.use('/infra/network', infraNetworkRoutes);
app.use('/aws', awsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;