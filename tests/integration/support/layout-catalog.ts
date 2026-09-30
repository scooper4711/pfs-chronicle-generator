/**
 * Reads layout definitions straight from assets/layouts so tests know what
 * the form should show for a layout (its PDF path and adventure summary
 * checkboxes) without hard-coding it.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';

const LAYOUT_ROOT = resolve(__dirname, '../../../assets/layouts');

export interface LayoutInfo {
  id: string;
  defaultChronicleLocation: string;
  checkboxes: string[];
}

interface LayoutFile {
  id: string;
  defaultChronicleLocation?: string;
  parameters?: { Checkboxes?: { summary_checkbox?: { choices?: string[] } } };
}

let catalog: Map<string, LayoutInfo> | undefined;

/** Looks up a layout by id, e.g. "pfs2.s1-01". */
export function layoutInfo(layoutId: string): LayoutInfo {
  catalog ??= loadCatalog();
  const info = catalog.get(layoutId);
  if (!info) throw new Error(`layoutInfo: no layout file with id ${layoutId}`);
  return info;
}

function loadCatalog(): Map<string, LayoutInfo> {
  const entries = listJsonFiles(LAYOUT_ROOT).map((path) => toLayoutInfo(JSON.parse(readFileSync(path, 'utf8'))));
  return new Map(entries.map((info) => [info.id, info]));
}

function toLayoutInfo(file: LayoutFile): LayoutInfo {
  return {
    id: file.id,
    defaultChronicleLocation: file.defaultChronicleLocation ?? '',
    checkboxes: file.parameters?.Checkboxes?.summary_checkbox?.choices ?? [],
  };
}

function listJsonFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return listJsonFiles(path);
    return entry.endsWith('.json') ? [path] : [];
  });
}
