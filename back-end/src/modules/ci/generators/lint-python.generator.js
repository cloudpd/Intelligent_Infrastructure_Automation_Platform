/**
 * LintPythonGenerator
 * Generates a step to run flake8 on a Python project.
 */
class LintPythonGenerator {
  generate() {
    return {
      name: 'Run Lint',
      run: 'flake8 .',
    };
  }
}

module.exports = LintPythonGenerator;
