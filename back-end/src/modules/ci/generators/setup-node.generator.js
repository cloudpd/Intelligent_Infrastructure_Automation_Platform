/**
 * SetupNodeGenerator
 * Generates steps to set up a Node.js environment and install npm dependencies.
 */
class SetupNodeGenerator {
  constructor(nodeVersion = '18') {
    this.nodeVersion = nodeVersion;
  }

  generate() {
    return [
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': this.nodeVersion,
          cache: 'npm',
        },
      },
      {
        name: 'Install Dependencies',
        run: 'npm ci',
      },
    ];
  }
}

module.exports = SetupNodeGenerator;
