const fs = require('fs');
const path = require('path');

/** Writes a flat map of { 'relative/path.tf': 'content' } to outputDir */
function writeFiles(outputDir, filesMap) {
  for (const [relativePath, content] of Object.entries(filesMap)) {
    const fullPath = path.join(outputDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }
}

/** Recursively copies a static module folder (e.g. modules/network) as-is */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

module.exports = { writeFiles, copyDir };
