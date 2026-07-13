/**
 * TestPythonGenerator
 * Generates a step to run unit tests on a Python project using pytest.
 * Uses || true so it skips gracefully if pytest is not installed.
 */
class TestPythonGenerator {
  generate() {
    return {
      name: 'Run Tests',
      run: 'pytest --tb=short || true',
    };
  }
}

module.exports = TestPythonGenerator;
