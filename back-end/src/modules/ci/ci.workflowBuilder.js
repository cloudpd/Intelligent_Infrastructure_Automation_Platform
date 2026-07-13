const yaml = require('js-yaml');
const HeaderGenerator = require('./generators/header.generator');
const TriggerGenerator = require('./generators/trigger.generator');
const CheckoutStepGenerator = require('./generators/checkout.generator');
const RegistryLoginGenerator = require('./generators/registry-login.generator');
const DockerBuildGenerator = require('./generators/docker-build.generator');
const TrivyGenerator = require('./generators/trivy.generator');
const DockerPushGenerator = require('./generators/docker-push.generator');
const SetupNodeGenerator = require('./generators/setup-node.generator');
const SetupPythonGenerator = require('./generators/setup-python.generator');
const LintNodeGenerator = require('./generators/lint-node.generator');
const LintPythonGenerator = require('./generators/lint-python.generator');

/**
 * Workflow Builder
 * Orchestrates all generators to create the complete GitHub Actions workflow
 */
class WorkflowBuilder {
  constructor(config) {
    const rawConfig = typeof config.toJSON === 'function' ? config.toJSON() : config;
    this.config = {
      pipeline_name: rawConfig.pipeline_name || rawConfig.pipelineName,
      trigger_branch: rawConfig.trigger_branch || rawConfig.triggerBranch,
      image_name: rawConfig.image_name || rawConfig.imageName,
      registry: rawConfig.registry,
      enableTrivy: rawConfig.enable_trivy !== undefined ? rawConfig.enable_trivy : rawConfig.enableTrivy,
      dockerHubUsername: rawConfig.dockerHubUsername || rawConfig.docker_hub_username,
      awsEcrRegion: rawConfig.awsEcrRegion || rawConfig.aws_ecr_region,
      // Language from the BuildConfig table set during the Dockerize step
      language: rawConfig.language || null,
    };
  }

  /**
   * Build the complete workflow object
   * @returns {object} 
   *  workflow configuration
   */
  build() {
    console.log("WorkflowBuilder is being executed");

    const workflow = {};

    // 1. Header
    const headerGen = new HeaderGenerator(this.config.pipeline_name);
    Object.assign(workflow, headerGen.generate());

    // 2. Trigger
    const triggerGen = new TriggerGenerator(this.config.trigger_branch);
    Object.assign(workflow, triggerGen.generate());

    // 3. Permissions (minimal, tighten as needed)
    workflow.permissions = {
      contents: 'read',
      packages: 'write',
      'security-events': 'write'
    };

    console.log(workflow.permissions);

    // 4. Jobs
    workflow.jobs = {
      build: {
        'runs-on': 'ubuntu-latest',
        steps: [],
      },
    };

    // 5. Checkout Step
    const checkoutGen = new CheckoutStepGenerator();
    workflow.jobs.build.steps.push(checkoutGen.generate());

    // 6. Setup Runtime & Install Dependencies (from BuildConfig.language)
    if (this.config.language === 'node') {
      const setupGen = new SetupNodeGenerator();
      workflow.jobs.build.steps.push(...setupGen.generate());

      // 7. Lint
      const lintGen = new LintNodeGenerator();
      workflow.jobs.build.steps.push(lintGen.generate());
    } else if (this.config.language === 'python') {
      const setupGen = new SetupPythonGenerator();
      workflow.jobs.build.steps.push(...setupGen.generate());

      // 7. Lint
      const lintGen = new LintPythonGenerator();
      workflow.jobs.build.steps.push(lintGen.generate());
    }

    // 6. Registry Login Step
    const registryConfig = {
      dockerHubUsername: this.config.dockerHubUsername,
      awsEcrRegion: this.config.awsEcrRegion,
    };

    const registryLoginGen = new RegistryLoginGenerator(
      this.config.registry,
      registryConfig
    );

    const loginSteps = registryLoginGen.generate();

    if (Array.isArray(loginSteps)) {
      workflow.jobs.build.steps.push(...loginSteps);
    } else {
      workflow.jobs.build.steps.push(loginSteps);
    }

    // 6. Docker Build Step
    const dockerBuildGen = new DockerBuildGenerator(
      this.config.image_name,
      this.config.registry,
      registryConfig
    );
    workflow.jobs.build.steps.push(dockerBuildGen.generate());

    // 8. Trivy Scan Step (Optional)
    if (this.config.enableTrivy) {
      const trivyGen = new TrivyGenerator(
        this.config.image_name,
        this.config.registry,
        registryConfig
      );
      workflow.jobs.build.steps.push(trivyGen.generate());
    }

    // 9. Docker Push Step
    const dockerPushGen = new DockerPushGenerator(
      this.config.image_name,
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
