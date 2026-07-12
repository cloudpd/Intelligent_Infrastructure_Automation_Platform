const yaml = require('js-yaml');
const HeaderGenerator = require('./generators/header.generator');
const TriggerGenerator = require('./generators/trigger.generator');
const CheckoutStepGenerator = require('./generators/checkout.generator');
const RegistryLoginGenerator = require('./generators/registry-login.generator');
const DockerBuildGenerator = require('./generators/docker-build.generator');
const TrivyGenerator = require('./generators/trivy.generator');
const DockerPushGenerator = require('./generators/docker-push.generator');

/**
 * Workflow Builder
 * Orchestrates all generators to create the complete GitHub Actions workflow
 */
class WorkflowBuilder {
  constructor(config) {
    this.config = config;
  }

  /**
   * Build the complete workflow object
   * @returns {object} 
   *  workflow configuration
   */
  build() {
    const workflow = {};

    // 1. Header
    const headerGen = new HeaderGenerator(this.config.pipelineName);
    Object.assign(workflow, headerGen.generate());

    // 2. Trigger
    const triggerGen = new TriggerGenerator(this.config.triggerBranch);
    Object.assign(workflow, triggerGen.generate());

    // 3. Permissions (minimal, tighten as needed)
    workflow.permissions = {
      contents: 'read',
      packages: 'write',
    };

    // 4. Jobs
    workflow.jobs = {
      build: {
        'runs-on': 'ubuntu-latest',
        steps: [],
      },
    };

    // 4. Checkout Step
    const checkoutGen = new CheckoutStepGenerator();
    workflow.jobs.build.steps.push(checkoutGen.generate());

    // 6. Registry Login Step
    const registryConfig = {
      dockerHubUsername: this.config.dockerHubUsername,
      awsEcrRegion: this.config.awsEcrRegion,
    };

    const registryLoginGen = new RegistryLoginGenerator(this.config.registry, registryConfig);
    workflow.jobs.build.steps.push(registryLoginGen.generate());

    // 6. Docker Build Step
    const dockerBuildGen = new DockerBuildGenerator(
      this.config.imageName,
      this.config.registry,
      registryConfig
    );
    workflow.jobs.build.steps.push(dockerBuildGen.generate());

    // 8. Trivy Scan Step (Optional)
    if (this.config.enableTrivy) {
      const trivyGen = new TrivyGenerator(
        this.config.imageName,
        this.config.registry,
        registryConfig
      );
      workflow.jobs.build.steps.push(trivyGen.generate());
    }

    // 9. Docker Push Step
    const dockerPushGen = new DockerPushGenerator(
      this.config.imageName,
      this.config.registry,
      registryConfig
    );
    workflow.jobs.build.steps.push(dockerPushGen.generate());

    return workflow;
  }

  /**
   * Generate YAML string from workflow object
   * @returns {string} YAML formatted workflow
   */
  generateYAML() {
    const workflowObj = this.build();
    return yaml.dump(workflowObj, {
      indent: 2,
      lineWidth: -1,
    });
  }

  /**
   * Get the workflow as a JavaScript object
   * @returns {object} Workflow configuration
   */
  getWorkflowObject() {
    return this.build();
  }
}

module.exports = WorkflowBuilder;
