import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readPrecacheEntries(serviceWorker) {
  const callStart = serviceWorker.indexOf('precacheAndRoute(');
  if (callStart < 0) throw new Error('PWA build check: service worker has no precacheAndRoute manifest.');

  const arrayStart = serviceWorker.indexOf('[', callStart);
  if (arrayStart < 0) throw new Error('PWA build check: service worker precache manifest is malformed.');

  let depth = 0;
  let quote = '';
  let escaped = false;
  let arrayEnd = -1;
  for (let index = arrayStart; index < serviceWorker.length; index += 1) {
    const character = serviceWorker[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '[') depth += 1;
    else if (character === ']' && --depth === 0) {
      arrayEnd = index;
      break;
    }
  }
  if (arrayEnd < 0) throw new Error('PWA build check: service worker precache manifest is unterminated.');

  const manifest = serviceWorker.slice(arrayStart, arrayEnd + 1);
  const entries = [];
  const entryPattern = /\{\s*url:\s*("(?:\\.|[^"\\])*")\s*,\s*revision:\s*(?:null|"(?:\\.|[^"\\])*")\s*\}/g;
  for (const match of manifest.matchAll(entryPattern)) entries.push(JSON.parse(match[1]));
  if (!entries.length) throw new Error('PWA build check: precache manifest contains no recognizable entries.');
  return entries;
}

export async function verifyPrecacheFiles(outputDirectory) {
  const serviceWorkerPath = path.join(outputDirectory, 'sw.js');
  let serviceWorker;
  try {
    serviceWorker = await readFile(serviceWorkerPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`PWA build check: missing service worker at ${serviceWorkerPath}.`);
    throw error;
  }

  const entries = readPrecacheEntries(serviceWorker);
  const missing = [];
  for (const entry of entries) {
    let url;
    try {
      url = new URL(entry, 'https://nodula-build.invalid/');
    } catch {
      missing.push(`${entry} (invalid URL)`);
      continue;
    }

    if (url.origin !== 'https://nodula-build.invalid') {
      missing.push(`${entry} (outside build output)`);
      continue;
    }

    let assetPath;
    try {
      assetPath = path.resolve(outputDirectory, decodeURIComponent(url.pathname.replace(/^\/+/, '')));
    } catch {
      missing.push(`${entry} (invalid path)`);
      continue;
    }

    const relativePath = path.relative(outputDirectory, assetPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      missing.push(`${entry} (outside build output)`);
      continue;
    }

    try {
      await access(assetPath);
    } catch (error) {
      if (error.code === 'ENOENT') missing.push(entry);
      else throw error;
    }
  }

  if (missing.length) {
    throw new Error([
      `PWA build check: ${missing.length} precache entr${missing.length === 1 ? 'y is' : 'ies are'} missing from ${outputDirectory}:`,
      ...missing.map((url) => `  - ${url}`),
      'Deploy the complete app build output, including all referenced hashed assets.',
    ].join('\n'));
  }

  return entries.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const appOutputDirectory = fileURLToPath(new URL('../../dist/app/', import.meta.url));
  const verifiedEntries = await verifyPrecacheFiles(appOutputDirectory);
  console.info(`PWA build check: verified ${verifiedEntries} precache files in dist/app.`);
}