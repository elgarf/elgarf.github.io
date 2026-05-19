#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const repoRoot = process.cwd();
const toolsRoot = path.join(repoRoot, "tools");
const entry = path.join(toolsRoot, "editor", "main.js");
const outDir = path.join(toolsRoot, "editor");
const manifestPath = path.join(toolsRoot, "editor-bundle-manifest.json");

const main = async () => {
  let esbuild;
  try {
    esbuild = require("esbuild");
  } catch {
    console.error("[bundle] esbuild is not installed. Run: npm i -D esbuild");
    process.exit(1);
  }

  if (!fs.existsSync(entry)) {
    console.error("[bundle] entry not found:", entry);
    process.exit(1);
  }

  const tempOut = path.join(outDir, "app.bundle.tmp.js");
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    sourcemap: false,
    minify: true,
    outfile: tempOut,
    legalComments: "none"
  });

  const code = fs.readFileSync(tempOut);
  const hash = crypto.createHash("sha256").update(code).digest("hex").slice(0, 10);
  const finalName = `app.${hash}.js`;
  const finalPath = path.join(outDir, finalName);

  for (const fileName of fs.readdirSync(outDir)) {
    if (/^app\.[a-f0-9]{10}\.js$/i.test(fileName)) {
      fs.rmSync(path.join(outDir, fileName), { force: true });
    }
  }

  fs.renameSync(tempOut, finalPath);

  const manifest = {
    version: hash,
    editorBundle: `./editor/${finalName}`
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`[bundle] wrote ${finalPath}`);
  console.log(`[bundle] wrote ${manifestPath}`);
};

main().catch(err => {
  console.error("[bundle] failed:", err && err.message ? err.message : err);
  process.exit(1);
});
