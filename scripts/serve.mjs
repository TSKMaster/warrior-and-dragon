import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const allowed = new Set(['/index.html', '/app.js', '/engine.js', '/styles.css', '/assets/parapet.svg', '/assets/characters/violet-v1.png', '/assets/characters/xaden-v1.png', '/assets/characters/dain-v1.png', '/story/pilot.json']);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const resource = pathname === '/' ? '/index.html' : pathname;
    if (!allowed.has(resource)) { response.writeHead(404); response.end('Not found'); return; }
    const content = await readFile(path.join(root, resource));
    response.writeHead(200, { 'Content-Type': `${types[path.extname(resource)]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(content);
  } catch { response.writeHead(500); response.end('Unable to load resource'); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`Воин и Дракон: http://127.0.0.1:${server.address().port}`));
