#!/usr/bin/env node
/**
 * E2E coverage report for the Playwright integration suite.
 *
 * Specs record Chromium V8 JS coverage into coverage/e2e-raw/*.json
 * (see startCoverage/stopCoverage in tests/integration/helpers.ts).
 * This script maps those ranges back onto scripts/*.ts through the
 * esbuild sourcemap, merges the per-spec chunks, and writes text +
 * HTML + lcov reports to coverage/e2e/.
 *
 * Usage: npm run coverage:e2e   (run *after* `npx playwright test`)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const v8toIstanbul = require('v8-to-istanbul');
const convertSourceMap = require('convert-source-map');

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const RAW_DIR = join(ROOT, 'coverage', 'e2e-raw');
const TMP_DIR = join(ROOT, 'coverage', '.e2e-tmp');
const REPORT_DIR = join(ROOT, 'coverage', 'e2e');
const BUNDLE = join(ROOT, 'dist', 'main.js');
const BUNDLE_MAP = `${BUNDLE}.map`;

function fail(message) {
  console.error(`e2e-coverage: ${message}`);
  process.exit(1);
}

if (!existsSync(BUNDLE) || !existsSync(BUNDLE_MAP)) {
  fail("dist/main.js(.map) missing — run 'npm run build' first.");
}
const rawFiles = existsSync(RAW_DIR) ? readdirSync(RAW_DIR).filter((f) => f.endsWith('.json')) : [];
if (rawFiles.length === 0) {
  fail('no raw chunks in coverage/e2e-raw/. Run `npx playwright test` first.');
}

const source = readFileSync(BUNDLE, 'utf8');
const parsedMap = JSON.parse(readFileSync(BUNDLE_MAP, 'utf8'));
// Fill missing sourcesContent from disk so the converter can map ranges.
if (!parsedMap.sourcesContent || parsedMap.sourcesContent.some((entry) => !entry)) {
  parsedMap.sourcesContent = parsedMap.sources.map((relativePath) => {
    try {
      return readFileSync(join(ROOT, 'dist', relativePath), 'utf8');
    } catch {
      try {
        return readFileSync(join(ROOT, relativePath), 'utf8');
      } catch {
        return '';
      }
    }
  });
}
const sourceMap = convertSourceMap.fromObject(parsedMap);

rmSync(TMP_DIR, { recursive: true, force: true });
mkdirSync(TMP_DIR, { recursive: true });

let chunks = 0;
for (const file of rawFiles) {
  const entries = JSON.parse(readFileSync(join(RAW_DIR, file), 'utf8'));
  for (let i = 0; i < entries.length; i++) {
    // Pass the local bundle path, NOT the page URL: v8-to-istanbul resolves
    // the map's relative sources against this path.
    const converter = v8toIstanbul(BUNDLE, 0, { source, sourceMap });
    await converter.load();
    converter.applyCoverage(entries[i].functions);
    writeFileSync(join(TMP_DIR, `${file.replace(/\.json$/, '')}-${i}.json`), JSON.stringify(converter.toIstanbul()));
    chunks += 1;
  }
}
console.log(`e2e-coverage: converted ${chunks} chunk(s) from ${rawFiles.length} spec(s)`);

execSync(`npx nyc merge ${TMP_DIR} ${join(REPORT_DIR, 'coverage-merged.json')}`, { stdio: 'inherit', cwd: ROOT });
execSync(
  `npx nyc report --temp-dir ${REPORT_DIR} --reporter=text --reporter=lcov --report-dir ${REPORT_DIR} --exclude 'node_modules/**'`,
  { stdio: 'inherit', cwd: ROOT }
);
rmSync(TMP_DIR, { recursive: true, force: true });

console.log(`e2e-coverage: report written to ${REPORT_DIR}/lcov.info`);
