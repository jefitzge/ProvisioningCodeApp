import { readdir } from 'node:fs/promises';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectDirectory = resolve(appDirectory, '../..');

const excludedDirectories = new Set([
  '.git',
  '.internal',
  '.power',
  'app-gen-sdk',
  'dist',
  'generated',
  'node_modules',
]);

const excludedPaths = new Set([
  'data-model/full-data-model.json',
]);

const standardFileNames = new Set([
  '.eslintignore',
  '.gitignore',
  '.oxlintrc.json',
  '.oxlintrc.security.json',
  'README.md',
  '_layout.tsx',
  'bun.lock',
  'components.json',
  'eslint.config.js',
  'index.html',
  'package.json',
  'power.config.json',
  'project.json',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
]);

const kebabCaseSegment = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidFileName(fileName) {
  if (standardFileNames.has(fileName) || fileName.startsWith('.')) {
    return true;
  }

  const extension = extname(fileName);
  const stem = extension ? fileName.slice(0, -extension.length) : fileName;
  return stem.split('.').every((segment) => kebabCaseSegment.test(segment));
}

async function findInvalidFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const invalidFiles = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const projectPath = relative(projectDirectory, absolutePath).split(sep).join('/');

    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        invalidFiles.push(...await findInvalidFiles(absolutePath));
      }
      continue;
    }

    if (!excludedPaths.has(projectPath) && !isValidFileName(basename(absolutePath))) {
      invalidFiles.push(projectPath);
    }
  }

  return invalidFiles;
}

const invalidFiles = await findInvalidFiles(projectDirectory);

if (invalidFiles.length > 0) {
  console.error('Files must use lower-case kebab-case names:');
  for (const file of invalidFiles.sort()) {
    console.error(`- ${file}`);
  }
  process.exitCode = 1;
} else {
  console.log('Filename check passed.');
}
