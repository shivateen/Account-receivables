// settings.js — user-configurable platform settings (persisted in DB)
import { Router } from 'express';
import { all, get, run } from '../db.js';
import { seed } from '../seed.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = all(`SELECT * FROM settings ORDER BY category, key`);
  const grouped = {};
  for (const r of rows) {
    (grouped[r.category] ||= []).push({ key: r.key, label: r.label, value: safe(r.value), updated_at: r.updated_at });
  }
  res.json(grouped);
});

function safe(j) { try { return JSON.parse(j); } catch { return j; } }

router.put('/:key', (req, res) => {
  const existing = get(`SELECT * FROM settings WHERE key=?`, req.params.key);
  if (!existing) return res.status(404).json({ error: 'unknown setting' });
  const value = req.body?.value;
  if (value === undefined) return res.status(400).json({ error: 'value required' });
  run(`UPDATE settings SET value=?, updated_at=? WHERE key=?`, JSON.stringify(value), new Date().toISOString(), req.params.key);
  res.json({ ok: true, key: req.params.key, value });
});

// Reset demo data (re-seed) — handy during a live demo
router.post('/reseed', (req, res) => {
  const counts = seed();
  res.json({ ok: true, counts });
});

export default router;
