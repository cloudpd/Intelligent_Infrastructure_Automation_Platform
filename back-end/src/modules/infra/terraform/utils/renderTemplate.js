const fs = require('fs');
const Handlebars = require('handlebars');

/**
 * Renders a file on disk through Handlebars.
 * noEscape: true is required — Handlebars HTML-escapes by default
 * (quotes become &quot; etc.), which would corrupt HCL syntax.
 */
function renderTemplate(filePath, data) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const template = Handlebars.compile(raw, { noEscape: true });
  return template(data);
}

module.exports = { renderTemplate };
