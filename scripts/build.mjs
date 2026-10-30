import { cp, mkdir, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const destination = new URL('dist/', root);
await mkdir(destination, { recursive: true });
for (const resource of ['index.html', 'app.js', 'engine.js', 'styles.css', 'assets', 'story/pilot.json']) {
  const target = new URL(resource, destination);
  await mkdir(new URL('./', target), { recursive: true });
  await cp(new URL(resource, root), target, { recursive: true });
}
await writeFile(new URL('.nojekyll', destination), '');
console.log('Static game built in dist/');
