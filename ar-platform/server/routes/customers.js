// customers.js — customer master + 360 view
import { Router } from 'express';
import { all, get } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(all(`SELECT c.*,
    (SELECT SUM(open_amount) FROM invoices WHERE customer_id=c.id AND status!='paid') open_ar,
    (SELECT SUM(open_amount) FROM invoices WHERE customer_id=c.id AND status!='paid' AND days_past_due>0) past_due
    FROM customers c ORDER BY open_ar DESC`));
});

router.get('/:id', (req, res) => {
  const c = get(`SELECT * FROM customers WHERE id=?`, req.params.id);
  if (!c) return res.status(404).json({ error: 'not found' });
  const invoices = all(`SELECT * FROM invoices WHERE customer_id=? ORDER BY due_date DESC`, c.id);
  const payments = all(`SELECT * FROM payments WHERE customer_id=? ORDER BY received_at DESC`, c.id);
  const cases = all(`SELECT * FROM collection_cases WHERE customer_id=?`, c.id);
  const openAR = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.open_amount || 0), 0);
  const pastDue = invoices.filter(i => i.status !== 'paid' && i.days_past_due > 0).reduce((s, i) => s + (i.open_amount || 0), 0);
  res.json({ ...c, invoices, payments, cases, openAR, pastDue });
});

export default router;
