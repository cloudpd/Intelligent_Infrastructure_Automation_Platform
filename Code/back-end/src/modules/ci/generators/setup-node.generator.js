/**
 * SetupNodeGenerator
 * Generates steps to set up a Node.js environment and install npm dependencies.
 */
class SetupNodeGenerator {
  constructor(nodeVersion = '18', enableInstall = true) {
    this.nodeVersion = nodeVersion;
    this.enableInstall = enableInstall;
  }

  generate() {
    const steps = [
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': this.nodeVersion,
          ...(this.enableInstall && { cache: 'npm' }),
        },
      },
    ];

    if (this.enableInstall) {
      steps.push({
        name: 'Install Dependencies',
        run: 'npm ci',
      });
    }

    return steps;
  }
}

module.exports = SetupNodeGenerator;
