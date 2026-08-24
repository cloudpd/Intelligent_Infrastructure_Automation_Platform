const yaml = require('js-yaml');
const HeaderGenerator = require('./generators/header.generator');
const TriggerGenerator = require('./generators/trigger.generator');
const CheckoutStepGenerator = require('./generators/checkout.generator');
const DeployEksGenerator = require('./generators/deploy-eks.generator');
const DeployVmGenerator = require('./generators/deploy-vm.generator');

/**
 * CD Workflow Builder
 * Creates a separate, dedicated Continuous Deployment workflow (.github/workflows/cd.yml)
 */
class CdWorkflowBuilder {
  constructor(config) {
    const rawConfig = typeof config.toJSON === 'function' ? config.toJSON() : config;
    const baseName = rawConfig.pipeline_name || rawConfig.pipelineName || 'Deployment';

    this.config = {
      pipeline_name: `${baseName} - CD`,
      trigger_branch: rawConfig.trigger_branch || rawConfig.triggerBranch || 'main',
      deploymentType: rawConfig.deploymentType || 'eks',
      eksClusterName: rawConfig.eksClusterName || null,
      vmInstanceId: rawConfig.vmInstanceId || null,
      kindClusterName: rawConfig.kindClusterName || 'kind',
    };
  }

  build() {
    const workflow = {};

    // 1. Header
    const headerGen = new HeaderGenerator(this.config.pipeline_name);
    Object.assign(workflow, headerGen.generate());

    // 2. Trigger
    const triggerGen = new TriggerGenerator(this.config.trigger_branch);
    Object.assign(workflow, triggerGen.generate());

    // 3. Permissions
    workflow.permissions = {
      contents: 'read',
    };

    // 4. Jobs
    workflow.jobs = {
      deploy: {
        'runs-on': 'ubuntu-latest',
        steps: [],
      },
    };

    // 5. Checkout Step
    const checkoutGen = new CheckoutStepGenerator();
    workflow.jobs.deploy.steps.push(checkoutGen.generate());

    // --- AWS credentials (needed for both the EKS API and SSM calls) ---
    workflow.jobs.deploy.steps.push({
      name: 'Configure AWS Credentials',
      uses: 'aws-actions/configure-aws-credentials@v4',
      with: {
        'aws-access-key-id': '${{ secrets.AWS_ACCESS_KEY_ID }}',
        'aws-secret-access-key': '${{ secrets.AWS_SECRET_ACCESS_KEY }}',
        'aws-region': '${{ secrets.AWS_REGION }}',
      },
    });

    // --- Deployment target ---
    if (this.config.deploymentType === 'vm') {
      // --- VM (KIND-on-EC2) CD DEPLOYMENT, via AWS SSM ---
      const deployVmGen = new DeployVmGenerator(this.config.vmInstanceId, this.config.kindClusterName);
      workflow.jobs.deploy.steps.push(...deployVmGen.generate());
    } else {
      // --- EKS CD DEPLOYMENT ---
      const deployEksGen = new DeployEksGenerator(this.config.eksClusterName);
      workflow.jobs.deploy.steps.push(...deployEksGen.generate());
    }

    return workflow;
  }

  /**
   * Generate YAML string for CD workflow
   * @returns {string} YAML formatted workflow
   */
  generateYAML() {
    const workflowObj = this.build();
    return yaml.dump(workflowObj, {
      indent: 2,
      lineWidth: -1,
    });
  }
}

module.exports = CdWorkflowBuilder;