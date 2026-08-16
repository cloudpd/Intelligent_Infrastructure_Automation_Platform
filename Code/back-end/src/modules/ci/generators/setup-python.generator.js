/**
 * SetupPythonGenerator
 * Generates steps to set up a Python environment and install pip dependencies.
 */
class SetupPythonGenerator {
  constructor(pythonVersion = '3.11', enableInstall = true) {
    this.pythonVersion = pythonVersion;
    this.enableInstall = enableInstall;
  }

  generate() {
    const steps = [
      {
        name: 'Setup Python',
        uses: 'actions/setup-python@v5',
        with: {
          'python-version': this.pythonVersion,
          ...(this.enableInstall && { cache: 'pip' }),
        },
      },
    ];

    if (this.enableInstall) {
      steps.push({
        name: 'Install Dependencies',
        run: 'pip install -r requirements.txt',
      });
    }

    return steps;
  }
}

module.exports = SetupPythonGenerator;
