const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  node: {
    BASE_IMAGE: 'node:22-alpine',
    PORT: '3000',
    RUN_COMMAND: '"node", "index.js"',
  },
  python: {
    BASE_IMAGE: 'python:3.12-slim',
    PORT: '8000',
    RUN_COMMAND: '"python", "app.py"',
  },
};

function loadRawTemplate(language) {
  const filePath = path.join(__dirname, 'templates', `${language}.dockerfile`);
  if (!fs.existsSync(filePath)) {
    const err = new Error(`No template found for language: ${language}`);
    err.statusCode = 400;
    throw err;
  }
  return fs.readFileSync(filePath, 'utf8');
}
function getDefaultsForLanguage(language) {
  if (!DEFAULTS[language]) {
    const err = new Error(`No defaults found for language: ${language}`);
    err.statusCode = 400;
    throw err;
  }
  return DEFAULTS[language];
}

function renderDockerfile(language, fields) {
  let content = loadRawTemplate(language);
  const values = { ...DEFAULTS[language], ...fields };

  for (const [key, value] of Object.entries(values)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}

module.exports = { getDefaultsForLanguage, renderDockerfile };