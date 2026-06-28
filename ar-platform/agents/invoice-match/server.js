// HTTP API — the same agent, callable headless over REST. Zero deps (node:http).
//   node server.js   →   POST /match  ·  GET /health  ·  GET /contract
import { createServer } from 'node:http';
import { matchPayment, loadConfig, VERSION, CONTRACT } from './src/index.js';

const PORT = process.env.PORT || 4600;
const json = (res, code, obj) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); };

createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, agent: CONTRACT.name, version: VERSION });
  if (req.method === 'GET' && req.url === '/contract') return json(res, 200, { ...CONTRACT, version: VERSION });
  if (req.method === 'POST' && req.url.startsWith('/match')) {
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      try {
        const cfg = loadConfig(new URL(req.url, 'http://x').searchParams.get('config') || 'default');
        json(res, 200, matchPayment(JSON.parse(body), cfg));
      } catch (e) { json(res, e.code === 'CONTRACT' ? 400 : 500, { error: e.message, errors: e.errors }); }
    });
    return;
  }
  json(res, 404, { error: 'not found' });
}).listen(PORT, () => console.log(`  ${CONTRACT.name} v${VERSION}  →  http://localhost:${PORT}   (POST /match · GET /health · GET /contract)`));
