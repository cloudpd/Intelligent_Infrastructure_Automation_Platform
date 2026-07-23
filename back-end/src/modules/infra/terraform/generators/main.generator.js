const path = require('path');
const AppError = require('../../../../core/utils/AppError');
const { renderTemplate } = require('../utils/renderTemplate');

const SNIPPETS_DIR = path.join(__dirname, '..', 'snippets');

function renderSnippet(name, data) {
  return renderTemplate(path.join(SNIPPETS_DIR, `${name}.hbs`), data);
}

/**
 * Builds the full main.tf content by concatenating one snippet per
 * infrastructure module the user actually configured.
 *
<<<<<<< HEAD
 * Each resource type maps to a matching .hbs file in snippets/.
 * Adding EKS/RDS later is just:
 *   if (eks) blocks.push(renderSnippet('eks', eks));
 * — main.generator.js itself doesn't need to change shape, only grow this list.
 */
function generateMainTf({ network, ecr }) {
=======
 * `network` and `eks` are wired up. Adding ECR/RDS later is just:
 *   if (ecr) blocks.push(renderSnippet('ecr', ecr));
 * with a matching ecr.hbs snippet file — main.generator.js itself doesn't
 * need to change shape, only grow this list.
 *
 * `eks` is intentionally rendered *after* `network` — eks.hbs contains
 * literal references to `module.network.*`, so the network block must
 * appear earlier in the emitted file. `eks` also can never be generated
 * without `network`: the eks module has no way to build its own VPC, so
 * that combination is a hard configuration error rather than a partial
 * (broken) main.tf.
 */
function generateMainTf({ network, eks }) {
>>>>>>> a420867 (add terraform not complete)
  const blocks = [];

  if (eks && !network) {
    throw new AppError('An EKS module cannot be generated without a Network module in the same project', 422);
  }

  if (network) {
    blocks.push(renderSnippet('network', network));
  }

<<<<<<< HEAD
  if (ecr) {
    blocks.push(renderSnippet('ecr', ecr));
=======
  if (eks) {
    blocks.push(renderSnippet('eks', eks));
>>>>>>> a420867 (add terraform not complete)
  }

  return blocks.join('\n\n');
}

module.exports = { generateMainTf, renderSnippet };
