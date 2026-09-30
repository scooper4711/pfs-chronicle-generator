// Validates mermaid diagrams in Markdown files by rendering them with mmdc.
// Usage: node scripts-build/validate-mermaid.mjs [file.md ...]
// With no arguments, every Markdown file under DEFAULT_DIRS is checked; the
// pre-commit hook passes only the staged files so commits stay fast.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';

const DEFAULT_DIRS = ['docs', '.kiro/specs'];
const MERMAID_FENCE = '```mermaid';

function findMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return findMarkdownFiles(fullPath);
    return extname(entry.name) === '.md' ? [fullPath] : [];
  });
}

function countDiagrams(content) {
  return content.split(MERMAID_FENCE).length - 1;
}

// mmdc renders every mermaid block in a Markdown file in one browser launch
// and exits non-zero on the first diagram that fails to parse.
function renderError(file, outputDir) {
  try {
    execFileSync('npx', ['mmdc', '--quiet', '-i', file, '-o', join(outputDir, basename(file))], { stdio: 'pipe' });
    return null;
  } catch (error) {
    const output = `${error.stderr ?? ''}${error.stdout ?? ''}`.trim() || error.message;
    return output.split('\n').find((line) => line.trim()) ?? output;
  }
}

function main() {
  const requested = process.argv.slice(2);
  const files = requested.length > 0 ? requested : DEFAULT_DIRS.flatMap(findMarkdownFiles);
  const outputDir = mkdtempSync(join(tmpdir(), 'mermaid-validate-'));
  let diagramCount = 0;
  let failures = 0;

  try {
    for (const file of files) {
      const diagrams = countDiagrams(readFileSync(file, 'utf-8'));
      if (diagrams === 0) continue;
      diagramCount += diagrams;
      const error = renderError(file, outputDir);
      if (error) {
        failures += 1;
        console.error(`❌ Invalid mermaid diagram in ${file}:\n   ${error}`);
      }
    }
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }

  if (failures > 0) {
    console.error(`\nMermaid validation failed in ${failures} file(s).`);
    process.exit(1);
  }
  console.log(`✅ ${diagramCount} mermaid diagram(s) validated.`);
}

main();
