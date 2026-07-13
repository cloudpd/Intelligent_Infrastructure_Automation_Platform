/**
 * LintNodeGenerator
 * Generates a step to run ESLint on a Node.js project.
 * Assumes the project has a "lint" script defined in package.json.
 */
class LintNodeGenerator {
  generate() {
    return {
      name: 'Run Lint',
      run: 'npm run lint',
    };
  }
}

module.exports = LintNodeGenerator;
