#!/usr/bin/env node
/**
 * Validates all JSON files in the repository.
 */

const fs = require('fs');
const path = require('path');

const JSON_DIRS = [
  path.join(__dirname, '..', 'assets', 'demo'),
];

let hasError = false;

for (const dir of JSON_DIRS) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`✔  ${path.relative(process.cwd(), filePath)}`);
    } catch (err) {
      console.error(`✘  ${path.relative(process.cwd(), filePath)}: ${err.message}`);
      hasError = true;
    }
  }
}

if (hasError) {
  process.exit(1);
}
