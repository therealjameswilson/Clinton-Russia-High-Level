#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function usage() {
  console.error(`Usage:
  node scripts/extract-document-pdf.js --source SOURCE.pdf --pages 10-12 --marker 9 --out public/documents/item.pdf

Rules:
  --pages must name only pages containing the actual memcon or telcon.
  --marker must be the original PDF marker/provenance page for that source item.
  The output PDF is ordered as document pages first, marker page last.`);
}

function readArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--") || !value || value.startsWith("--")) {
      usage();
      process.exit(1);
    }
    args[key.slice(2)] = value;
    index += 1;
  }
  return args;
}

function pageSpecs(value, label) {
  const specs = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!specs.length || !specs.every((spec) => /^\d+(?:-\d+)?$/.test(spec))) {
    throw new Error(`${label} must be a comma-separated list of page numbers or ranges.`);
  }

  for (const spec of specs) {
    const [start, end] = spec.split("-").map(Number);
    if (!start || (end && end < start)) throw new Error(`${label} has an invalid range: ${spec}`);
  }

  return specs;
}

function main() {
  const args = readArgs(process.argv);
  const required = ["source", "pages", "marker", "out"];
  const missing = required.filter((key) => !args[key]);
  if (missing.length) {
    usage();
    throw new Error(`Missing required option(s): ${missing.join(", ")}`);
  }

  const source = path.resolve(args.source);
  const out = path.resolve(args.out);
  if (!fs.existsSync(source)) throw new Error(`Source PDF not found: ${source}`);

  const pages = pageSpecs(args.pages, "--pages");
  const marker = pageSpecs(args.marker, "--marker");
  fs.mkdirSync(path.dirname(out), { recursive: true });

  const qpdfArgs = ["--empty", "--pages"];
  for (const spec of pages) qpdfArgs.push(source, spec);
  for (const spec of marker) qpdfArgs.push(source, spec);
  qpdfArgs.push("--", out);

  const result = spawnSync("qpdf", qpdfArgs, { encoding: "utf8" });
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`qpdf failed with exit code ${result.status}`);
  }

  console.log(`Wrote ${out}`);
}

main();
