import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
await build({ entryPoints: ['src/background.ts', 'src/content.ts', 'src/popup.ts'], outdir: 'dist', bundle: true, format: 'iife', target: 'chrome120', minify: true, legalComments: 'eof' });
await cp('public', 'dist', { recursive: true });
await cp('LICENSE', 'dist/LICENSE');
await cp('node_modules/exifr/LICENSE', 'dist/EXIFR-LICENSE');
