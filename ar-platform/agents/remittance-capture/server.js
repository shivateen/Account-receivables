// HTTP API — POST /capture (text/plain or JSON CaptureRequest) · GET /health · GET /contract
import { createServer } from 'node:http';
import { capture, loadConfig, VERSION, CONTRACT } from './src/index.js';

const PORT = process.env.PORT || 4601;
const json = (res, code, obj) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); };

createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, agent: CONTRACT.name, version: VERSION });
  if (req.method === 'GET' && req.url === '/contract') return json(res, 200, { ...CONTRACT, version: VERSION });
  if (req.method === 'POST' && req.url.startsWith('/capture')) {
    let body = ''; req.on('data', c => body += c); req.on('end', async () => {
      try {
        const ct = req.headers['content-type'] || '';
        const reqObj = ct.includes('application/json') ? JSON.parse(body) : { text: body };
        json(res, 200, await capture(reqObj, loadConfig('default')));
      } catch (e) { json(res, e.code === 'CONTRACT' || e.code === 'PROVIDER' ? 400 : 500, { error: e.message, errors: e.errors }); }
    });
    return;
  }
  json(res, 404, { error: 'not found' });
}).listen(PORT, () => console.log(`  ${CONTRACT.name} v${VERSION}  →  http://localhost:${PORT}   (POST /capture · GET /health · GET /contract)`));
