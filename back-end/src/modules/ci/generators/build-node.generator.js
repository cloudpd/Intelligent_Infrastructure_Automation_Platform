/**
 * BuildNodeGenerator
 * Generates a step to build/compile a Node.js project.
 * Uses --if-present so it skips gracefully if no build script is defined.
 */
class BuildNodeGenerator {
  generate() {
    return {
      name: 'Build Application',
      run: 'npm run build --if-present',
    };
  }
}

module.exports = BuildNodeGenerator;
