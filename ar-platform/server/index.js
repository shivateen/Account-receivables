// ---------------------------------------------------------------------------
// index.js — Express server: REST API + static web suite for the AR Accelerator
// ---------------------------------------------------------------------------
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initSchema, isSeeded } from './db.js';
import { seed } from './seed.js';

import metrics from './routes/metrics.js';
import cashapp from './routes/cashapp.js';
import collections from './routes/collections.js';
import disputes from './routes/disputes.js';
import deductions from './routes/deductions.js';
import roi from './routes/roi.js';
import kpi from './routes/kpi.js';
import customers from './routes/customers.js';
import agents from './routes/agents.js';
import settings from './routes/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB = join(__dirname, '..', 'web');
const PORT = process.env.PORT || 3100;

// Boot: ensure schema + seed if empty
initSchema();
if (!isSeeded()) {
  const c = seed();
  console.log('• Seeded AR database:', JSON.stringify(c));
} else {
  console.log('• AR database already seeded (use POST /api/settings/reseed to refresh)');
}

const app = express();
app.use(express.json());

// API routes
app.use('/api/metrics', metrics);
app.use('/api/cashapp', cashapp);
app.use('/api/collections', collections);
app.use('/api/disputes', disputes);
app.use('/api/deductions', deductions);
app.use('/api/roi', roi);
app.use('/api/kpi', kpi);
app.use('/api/customers', customers);
app.use('/api/agents', agents);
app.use('/api/settings', settings);
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'ar-accelerator', ts: new Date().toISOString() }));
app.get('/favicon.ico', (req, res) => res.type('image/svg+xml').send(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23F08C1E'/><text x='16' y='22' font-family='Arial' font-size='13' font-weight='700' fill='white' text-anchor='middle'>AR</text></svg>`));

// Static front-end
app.use(express.static(WEB));
app.get('/', (req, res) => res.sendFile(join(WEB, 'index.html')));

app.listen(PORT, () => {
  console.log(`\n  Tiger O2C · AR Accelerator running`);
  console.log(`  → http://localhost:${PORT}\n`);
});
