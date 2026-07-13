const fs = require('fs');
const path = require('path');

function getDefaultDockerfile(language) {
  const filePath = path.join(__dirname, 'templates', `${language}.dockerfile`);
  if (!fs.existsSync(filePath)) {
    const err = new Error(`No template found for language: ${language}`);
    err.statusCode = 400;
    throw err;
  }
  return fs.readFileSync(filePath, 'utf8');
}

module.exports = { getDefaultDockerfile };