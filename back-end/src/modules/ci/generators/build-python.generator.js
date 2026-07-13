/**
 * BuildPythonGenerator
 * Generates a step to build a Python project (usually compilation check or packaging).
 * Simply compiles python files to verify syntax correctness.
 */
class BuildPythonGenerator {
  generate() {
    return {
      name: 'Build Application',
      run: 'python -m compileall .',
    };
  }
}

module.exports = BuildPythonGenerator;
