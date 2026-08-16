/**
 * TestNodeGenerator
 * Generates a step to run unit tests on a Node.js project.
 * Uses --if-present so it skips gracefully if no test script is configured.
 */
class TestNodeGenerator {
  generate() {
    return {
      name: 'Run Tests',
      run: 'npm test --if-present',
    };
  }
}

module.exports = TestNodeGenerator;
