const path = require('path');
const { renderTemplate } = require('../utils/renderTemplate');

const SNIPPETS_DIR = path.join(__dirname, '..', 'snippets');

function renderSnippet(name, data) {
  return renderTemplate(path.join(SNIPPETS_DIR, `${name}.hbs`), data);
}

/**
 * Builds the full main.tf content by concatenating one snippet per
 * infrastructure module the user actually configured.
 *
 * Only `network` is wired up right now. Adding ECR/EKS/RDS later is just:
 *   if (ecr) blocks.push(renderSnippet('ecr', ecr));
 *   if (eks) blocks.push(renderSnippet('eks', eks));
 * with matching ecr.hbs / eks.hbs snippet files — main.generator.js itself
 * doesn't need to change shape, only grow this list.
 */
function generateMainTf({ network }) {
  const blocks = [];

  if (network) {
    blocks.push(renderSnippet('network', network));
  }

  return blocks.join('\n\n');
}

module.exports = { generateMainTf, renderSnippet };
