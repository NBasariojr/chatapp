#!/usr/bin/env node

/**
 * generate-tree.js
 * Generates a tree-style file structure of your project.
 *
 * Usage:
 *   node generate-tree.js [root] [options]
 *
 * Options:
 *   --only=<dirs>          Comma-separated top-level folders to scan (e.g. web,backend)
 *   --ignore=<dirs>        Comma-separated list of dirs/files to ignore
 *   --ext=<extensions>     Comma-separated file extensions to exclude (e.g. .log,.tmp)
 *   --depth=<number>       Max depth to traverse (default: unlimited)
 *   --output=<file>        Output file path (.txt or .md). Omit for console only.
 *   --dirs-first           Show directories before files at each level
 *   --help                 Show this help message
 *
 * Examples:
 *   node generate-tree.js
 *   node generate-tree.js --only=web
 *   node generate-tree.js --only=web,backend --output=structure.md
 *   node generate-tree.js --ignore=node_modules,dist,.git --output=structure.md
 *   node generate-tree.js --depth=3 --dirs-first --output=structure.txt
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Tree Characters ─────────────────────────────────────────────────────────

const CHARS = {
  branch: '├── ',
  last:   '└── ',
  pipe:   '│   ',
  blank:  '    ',
};

// ─── Argument Parsing ─────────────────────────────────────────────────────────

/**
 * Parses CLI arguments into a structured config object.
 * @returns {{ root: string, ignore: Set<string>, ext: Set<string>, depth: number, output: string|null, dirsFirst: boolean }}
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const config = {
    root:      '.',
    only:      new Set(), // If non-empty, only these top-level dirs are scanned
    ignore:    new Set(['node_modules', 'dist', '.git', '.next', '__pycache__', '.cache']),
    ext:       new Set(),
    depth:     Infinity,
    output:    null,
    dirsFirst: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--only=')) {
      const entries = arg.slice('--only='.length).split(',').map(s => s.trim()).filter(Boolean);
      config.only = new Set(entries);

    } else if (arg.startsWith('--ignore=')) {
      const entries = arg.slice('--ignore='.length).split(',').map(s => s.trim()).filter(Boolean);
      config.ignore = new Set(entries);

    } else if (arg.startsWith('--ext=')) {
      const entries = arg.slice('--ext='.length).split(',').map(s => s.trim()).filter(Boolean);
      config.ext = new Set(entries.map(e => (e.startsWith('.') ? e : `.${e}`)));

    } else if (arg.startsWith('--depth=')) {
      const d = parseInt(arg.slice('--depth='.length), 10);
      config.depth = Number.isFinite(d) && d > 0 ? d : Infinity;

    } else if (arg.startsWith('--output=')) {
      config.output = arg.slice('--output='.length).trim();

    } else if (arg === '--dirs-first') {
      config.dirsFirst = true;

    } else if (!arg.startsWith('--')) {
      // Treat as root directory
      config.root = arg;
    }
  }

  return config;
}

// ─── Core Tree Builder ────────────────────────────────────────────────────────

/**
 * Recursively builds tree lines for a given directory.
 *
 * @param {string}   dirPath    - Absolute path to the directory
 * @param {string}   prefix     - Current indentation prefix
 * @param {object}   config     - Parsed config options
 * @param {number}   depth      - Current depth counter
 * @param {string[]} lines      - Accumulator for output lines
 */
function buildTree(dirPath, prefix, config, depth, lines) {
  if (depth > config.depth) return;

  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    lines.push(`${prefix}${CHARS.last}[Permission Denied]`);
    return;
  }

  // Filter out ignored names and excluded extensions
  const filtered = entries.filter(entry => {
    if (config.ignore.has(entry.name)) return false;
    if (!entry.isDirectory() && config.ext.size > 0) {
      const ext = path.extname(entry.name);
      if (config.ext.has(ext)) return false;
    }
    return true;
  });

  // Optional: directories first
  if (config.dirsFirst) {
    filtered.sort((a, b) => {
      const aIsDir = a.isDirectory() ? 0 : 1;
      const bIsDir = b.isDirectory() ? 0 : 1;
      return aIsDir - bIsDir || a.name.localeCompare(b.name);
    });
  } else {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  filtered.forEach((entry, index) => {
    const isLast      = index === filtered.length - 1;
    const connector   = isLast ? CHARS.last : CHARS.branch;
    const isDir       = entry.isDirectory();
    const isSymlink   = entry.isSymbolicLink();
    const displayName = entry.name + (isDir ? '/' : '') + (isSymlink ? ' → [symlink]' : '');

    lines.push(`${prefix}${connector}${displayName}`);

    if (isDir && !isSymlink) {
      const childPrefix = prefix + (isLast ? CHARS.blank : CHARS.pipe);
      buildTree(path.join(dirPath, entry.name), childPrefix, config, depth + 1, lines);
    }
  });
}

/**
 * Generates the full tree string for a root directory.
 * If config.only is non-empty, only those top-level subdirectories are scanned.
 *
 * @param {object} config - Parsed config options
 * @returns {string}      - Full formatted tree output
 */
function generateTree(config) {
  const absRoot = path.resolve(config.root);

  if (!fs.existsSync(absRoot)) {
    throw new Error(`Root path does not exist: "${absRoot}"`);
  }

  const stat = fs.statSync(absRoot);
  if (!stat.isDirectory()) {
    throw new Error(`Root path is not a directory: "${absRoot}"`);
  }

  // ── --only mode: scan each requested folder as its own root ──────────────
  if (config.only.size > 0) {
    const sections = [];

    for (const name of config.only) {
      const targetPath = path.join(absRoot, name);

      if (!fs.existsSync(targetPath)) {
        console.warn(`⚠  Warning: "${name}" not found in ${absRoot} — skipping.`);
        continue;
      }

      const targetStat = fs.statSync(targetPath);
      if (!targetStat.isDirectory()) {
        console.warn(`⚠  Warning: "${name}" is not a directory — skipping.`);
        continue;
      }

      const lines = [`${name}/`];
      buildTree(targetPath, '', config, 1, lines);
      sections.push(lines.join('\n'));
    }

    if (sections.length === 0) {
      throw new Error('No valid directories found for --only filter.');
    }

    // Summary across all sections
    const combined   = sections.join('\n\n');
    const allLines   = combined.split('\n');
    const dirCount   = allLines.filter(l => l.endsWith('/')).length - sections.length;
    const fileCount  = allLines.filter(l => l.trim() && !l.endsWith('/') && !l.startsWith('⚠')).length;

    return `${combined}\n\n${dirCount} director${dirCount === 1 ? 'y' : 'ies'}, ${fileCount} file${fileCount === 1 ? '' : 's'}`;
  }

  // ── Default mode: scan entire root ───────────────────────────────────────
  const rootName = path.basename(absRoot) + '/';
  const lines    = [rootName];

  buildTree(absRoot, '', config, 1, lines);

  // Summary counts
  const total     = lines.length - 1;
  const dirCount  = lines.filter(l => l.endsWith('/')).length - 1;
  const fileCount = total - dirCount;

  lines.push('');
  lines.push(`${dirCount} director${dirCount === 1 ? 'y' : 'ies'}, ${fileCount} file${fileCount === 1 ? '' : 's'}`);

  return lines.join('\n');
}

// ─── Output ───────────────────────────────────────────────────────────────────

/**
 * Writes output to console and/or a file.
 *
 * @param {string}      content - Tree string
 * @param {string|null} outPath - Optional file output path
 */
function writeOutput(content, outPath) {
  // Always print to console
  console.log(content);

  if (!outPath) return;

  const ext = path.extname(outPath).toLowerCase();

  let fileContent = content;

  // Wrap in markdown code block if .md output
  if (ext === '.md') {
    const fence = '```';
    fileContent = `# Project Structure\n\n${fence}\n${content}\n${fence}\n`;
  }

  try {
    fs.writeFileSync(outPath, fileContent, 'utf8');
    console.log(`\n✔  Saved to: ${path.resolve(outPath)}`);
  } catch (err) {
    console.error(`\n✘  Failed to write output file: ${err.message}`);
    process.exit(1);
  }
}

// ─── Help ─────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
generate-tree.js — Project file structure generator

USAGE:
  node generate-tree.js [root] [options]

ARGUMENTS:
  root                   Root directory to scan (default: current directory)

OPTIONS:
  --only=<list>          Comma-separated top-level folders to scan
                         Example: --only=web  or  --only=web,backend,packages

  --ignore=<list>        Comma-separated names to exclude
                         Default: node_modules,dist,.git,.next,__pycache__,.cache

  --ext=<list>           Comma-separated file extensions to exclude
                         Example: --ext=.log,.tmp,.map

  --depth=<number>       Max depth to traverse (default: unlimited)

  --output=<file>        Save output to a .txt or .md file
                         Markdown files get a code-fenced block automatically

  --dirs-first           List directories before files at each level

  --help, -h             Show this help message

EXAMPLES:
  node generate-tree.js
  node generate-tree.js --only=web
  node generate-tree.js --only=web,backend
  node generate-tree.js --only=backend --output=backend-structure.md
  node generate-tree.js --ignore=node_modules,dist,.git --output=structure.md
  node generate-tree.js --depth=3 --dirs-first
  node generate-tree.js --only=web,packages --depth=4 --output=docs/tree.txt
`);
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

function main() {
  try {
    const config  = parseArgs();
    const tree    = generateTree(config);
    writeOutput(tree, config.output);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

main();