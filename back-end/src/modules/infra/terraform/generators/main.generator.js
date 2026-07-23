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
 * Each resource type maps to a matching .hbs file in snippets/.
 * Adding EKS/RDS later is just:
 *   if (eks) blocks.push(renderSnippet('eks', eks));
 * — main.generator.js itself doesn't need to change shape, only grow this list.
 */
function generateMainTf({ network, ecr }) {
  const blocks = [];

  if (network) {
    blocks.push(renderSnippet('network', network));
  }

  if (ecr) {
    blocks.push(renderSnippet('ecr', ecr));
  }

  return blocks.join('\n\n');
}

module.exports = { generateMainTf, renderSnippet };
