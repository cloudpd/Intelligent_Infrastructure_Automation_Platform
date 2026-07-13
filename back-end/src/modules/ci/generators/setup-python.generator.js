/**
 * SetupPythonGenerator
 * Generates steps to set up a Python environment and install pip dependencies.
 */
class SetupPythonGenerator {
  constructor(pythonVersion = '3.11') {
    this.pythonVersion = pythonVersion;
  }

  generate() {
    return [
      {
        name: 'Setup Python',
        uses: 'actions/setup-python@v5',
        with: {
          'python-version': this.pythonVersion,
          cache: 'pip',
        },
      },
      {
        name: 'Install Dependencies',
        run: 'pip install -r requirements.txt',
      },
    ];
  }
}

module.exports = SetupPythonGenerator;
