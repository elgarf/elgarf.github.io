#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const toolsRoot = path.join(repoRoot, 'tools');
if (!fs.existsSync(toolsRoot)) {
  console.error('[manifest] tools directory not found:', toolsRoot);
  process.exit(1);
}

const version = Math.floor(Date.now() / 1000).toString();
const imports = {};

const walk = dir => {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      walk(full);
      continue;
    }
    if (!name.isFile() || path.extname(name.name).toLowerCase() !== '.js') continue;
    const rel = path.relative(toolsRoot, full).split(path.sep).join('/');
    const key = `./${rel}`;
    imports[key] = `${key}?v=${version}`;
  }
};

walk(toolsRoot);

const manifest = { version, imports };
const outPath = path.join(toolsRoot, 'asset-manifest.json');
const json = JSON.stringify(manifest, null, 2) + '\n';
fs.writeFileSync(outPath, json, { encoding: 'utf8' });
console.log(`[manifest] wrote ${outPath} version=${version} entries=${Object.keys(imports).length}`);
